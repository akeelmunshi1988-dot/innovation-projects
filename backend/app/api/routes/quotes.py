import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
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
from app.services import email_service


_SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}


def _send_quote_notification(db: Session, quote: Quote, tenant: "Tenant", customer: "Customer") -> None:
    """Fire-and-forget templated email to customer when a quote is sent."""
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

    if quote.expected_delivery_days is not None:
        delivery_days = int(quote.expected_delivery_days)
    else:
        rug = quote.rug_catalog
        delivery_days = (rug.lead_time_days if rug else 21) or 21
        if quote.rush_order:
            delivery_days = max(7, delivery_days // 2)
    delivery_str = f"{delivery_days} days"

    vendor_note: str = str(quote.vendor_notes) if quote.vendor_notes is not None else ""
    note_html = (
        f'<div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:12px 16px;'
        f'margin:16px 0;border-radius:4px"><p style="margin:0;font-size:13px;color:#1e40af">'
        f'<strong>Note from our team:</strong> {vendor_note}</p></div>'
    ) if vendor_note else ""
    note_text = f"Note: {vendor_note}\n" if vendor_note else ""

    subject, body_text, body_html = email_service.render_template(
        db, quote.tenant_id, "quote_sent",
        {
            "customer_name": customer.name,
            "tenant_name": tenant.name,
            "rug_name": rug_name,
            "size": size_str,
            "qty": qty_str,
            "price": price_str,
            "expected_delivery": delivery_str,
            "note_html": note_html,
            "note_text": note_text,
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html)

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
        _send_quote_notification(db, quote, tenant, customer)

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
        _send_quote_notification(db, quote, tenant, customer)

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
