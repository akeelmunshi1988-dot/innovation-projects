import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Quote, Customer, RugCatalog, Material, StaffUser, Tenant
from app.schemas.schemas import (
    QuoteCreate,
    QuoteUpdate,
    Quote as QuoteSchema,
    QuoteCalculateRequest,
    QuoteCalculateResponse,
    QuoteSendRequest,
    QuoteAdjustRequest,
)
from app.services.quote_engine import QuoteEngine


_SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}


def _send_quote_notification(quote: Quote, tenant: "Tenant", customer: "Customer") -> None:
    """Fire-and-forget email to customer when a quote is sent. Silently skips if SMTP not configured."""
    smtp_host = settings.SMTP_HOST
    smtp_user = settings.SMTP_USERNAME
    smtp_pass = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM_EMAIL
    if not smtp_host or not smtp_user or not smtp_pass or not smtp_from:
        return

    to_email: Optional[str] = customer.email if customer else None
    if not to_email:
        return

    currency: str = str(quote.price_currency) if quote.price_currency is not None else "INR"
    sym = _SYMBOLS.get(currency, "")

    rug_name: str = str(quote.rug_catalog.name) if quote.rug_catalog else "Custom Rug Order"

    w = quote.custom_size_w
    h = quote.custom_size_h
    size_str = f"{w:g}m × {h:g}m" if w is not None and h is not None else "custom size"

    fp = quote.final_price
    price_str = f"{sym}{fp:,.2f}" if fp is not None else "to be confirmed"

    qty: int = int(quote.qty) if quote.qty is not None else 1
    qty_str = f"{qty} piece{'s' if qty > 1 else ''}"

    vendor_note: str = str(quote.vendor_notes) if quote.vendor_notes is not None else ""
    tenant_name: str = str(tenant.name)
    customer_name: str = str(customer.name)

    subject = f"Your Quote is Ready �� {rug_name} | {tenant_name}"

    note_html = (
        f'<div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:12px 16px;'
        f'margin:16px 0;border-radius:4px"><p style="margin:0;font-size:13px;color:#1e40af">'
        f'<strong>Note from our team:</strong> {vendor_note}</p></div>'
    ) if vendor_note else ""

    html_body = f"""\
<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">
<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">
  <h1 style="color:#fbbf24;margin:0;font-size:22px">{tenant_name}</h1>
  <p style="color:#929290;margin:4px 0 0;font-size:13px">Your quote is ready for review</p>
</div>
<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">
  <p>Dear <strong>{customer_name}</strong>,</p>
  <p>Great news — we've prepared a quote for your order. Please review the details below:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:8px 0;color:#666;width:40%">Rug</td><td style="padding:8px 0;font-weight:600">{rug_name}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Size</td><td style="padding:8px 0">{size_str}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Quantity</td><td style="padding:8px 0">{qty_str}</td></tr>
    <tr style="border-top:2px solid #e5e5e5"><td style="padding:12px 0;color:#666;font-weight:600">Total Price</td>
    <td style="padding:12px 0;font-size:18px;font-weight:700;color:#d97706">{price_str}</td></tr>
  </table>
  {note_html}
  <p>To <strong>accept or decline</strong> this quote, log in to your account and visit <em>My Quotes</em>.</p>
  <p style="color:#888;font-size:12px;margin-top:24px">This quote is valid for 7 days. For any queries, reply to this email.<br>— {tenant_name} Team</p>
</div>
</body></html>"""

    plain_body = (
        f"Dear {customer_name},\n\n"
        f"Your quote from {tenant_name} is ready.\n\n"
        f"Rug: {rug_name}\nSize: {size_str}\nQty: {qty_str}\nTotal: {price_str}\n"
        + (f"Note: {vendor_note}\n" if vendor_note else "")
        + f"\nLog in to your account and visit 'My Quotes' to accept or decline.\n\n– {tenant_name} Team"
    )

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{smtp_from}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(smtp_user, smtp_pass)
            smtp.send_message(msg)
    except Exception as e:
        logger.warning("Quote notification email failed: %s", e)

router = APIRouter()


@router.get("/quotes", response_model=List[QuoteSchema])
def get_quotes(
    skip: int = 0,
    limit: int = 500,
    status: Optional[str] = None,
    rush_order: Optional[bool] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    q = db.query(Quote).filter(Quote.tenant_id == current_user.tenant_id)

    if status:
        q = q.filter(Quote.status == status)

    if rush_order is not None:
        q = q.filter(Quote.rush_order == rush_order)

    if search:
        pattern = f"%{search}%"
        q = (
            q.outerjoin(Customer, Quote.customer_id == Customer.id)
             .outerjoin(RugCatalog, Quote.rug_catalog_id == RugCatalog.id)
             .filter(or_(
                Customer.name.ilike(pattern),
                Customer.company.ilike(pattern),
                Customer.email.ilike(pattern),
                RugCatalog.name.ilike(pattern),
             ))
        )

    if date_from:
        try:
            q = q.filter(Quote.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass

    if date_to:
        try:
            q = q.filter(Quote.created_at <= datetime.fromisoformat(date_to + "T23:59:59"))
        except ValueError:
            pass

    return q.order_by(Quote.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/quotes/{quote_id}", response_model=QuoteSchema)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.post("/quotes", response_model=QuoteSchema)
def create_quote(
    quote: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    tid = current_user.tenant_id
    if quote.customer_id:
        if not db.query(Customer).filter(Customer.id == quote.customer_id, Customer.tenant_id == tid).first():
            raise HTTPException(status_code=404, detail="Customer not found")
    if quote.rug_catalog_id:
        if not db.query(RugCatalog).filter(RugCatalog.id == quote.rug_catalog_id, RugCatalog.tenant_id == tid).first():
            raise HTTPException(status_code=404, detail="Rug catalog item not found")
    if quote.material_id:
        if not db.query(Material).filter(Material.id == quote.material_id, Material.tenant_id == tid).first():
            raise HTTPException(status_code=404, detail="Material not found")

    db_quote = Quote(**quote.model_dump(), tenant_id=tid, price_currency=current_user.tenant.base_currency)
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote


@router.put("/quotes/{quote_id}", response_model=QuoteSchema)
def update_quote(
    quote_id: int,
    quote_update: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    for field, value in quote_update.model_dump(exclude_unset=True).items():
        setattr(quote, field, value)
    db.commit()
    db.refresh(quote)
    return quote


@router.delete("/quotes/{quote_id}")
def delete_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(quote)
    db.commit()
    return {"message": "Quote deleted successfully"}


@router.patch("/quotes/{quote_id}/send-to-customer", response_model=QuoteSchema)
def send_quote_to_customer(
    quote_id: int,
    body: QuoteSendRequest,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status not in ("draft", "sent", "revised"):
        raise HTTPException(status_code=400, detail=f"Cannot send a quote with status '{quote.status}'")
    quote.status = "sent"
    if body.vendor_notes is not None:
        quote.vendor_notes = body.vendor_notes
    db.commit()
    db.refresh(quote)

    customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    if customer and tenant:
        _send_quote_notification(quote, tenant, customer)

    return quote


@router.patch("/quotes/{quote_id}/adjust", response_model=QuoteSchema)
def adjust_quote_price(
    quote_id: int,
    body: QuoteAdjustRequest,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot adjust a quote that is already '{quote.status}'")
    quote.final_price = body.final_price
    if body.vendor_notes is not None:
        quote.vendor_notes = body.vendor_notes
    if body.manual_discount_pct is not None:
        quote.manual_discount_pct = body.manual_discount_pct
    # Re-send to customer after adjustment
    quote.status = "sent"
    db.commit()
    db.refresh(quote)

    customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    if customer and tenant:
        _send_quote_notification(quote, tenant, customer)

    return quote


@router.post("/quotes/calculate", response_model=QuoteCalculateResponse)
def calculate_quote(
    request: QuoteCalculateRequest,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    engine = QuoteEngine(db, tenant_id=current_user.tenant_id)
    result = engine.calculate_quote(
        rug_id=request.rug_id,
        size_w=request.size_w,
        size_h=request.size_h,
        material_id=request.material_id,
        qty=request.qty,
        rush_order=request.rush_order,
        manual_discount_pct=request.manual_discount_pct,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
