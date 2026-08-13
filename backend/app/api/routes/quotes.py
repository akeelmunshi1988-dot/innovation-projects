import logging
import math
import os
import uuid

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.models import Quote, Customer, RugCatalog, Material, StaffUser, Tenant, Order
from app.schemas.schemas import (
    QuoteCreate,
    QuoteUpdate,
    Quote as QuoteSchema,
    QuotePaginatedResponse,
    QuoteCalculateRequest,
    QuoteCalculateResponse,
    QuoteSendRequest,
    QuoteAdjustRequest,
    QuoteRejectRequest,
    QuoteSampleImagesRequest,
)
from app.services.quote_engine import QuoteEngine
from app.services import email_service

SAMPLE_IMAGE_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "quote-samples")
SAMPLE_IMAGE_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
SAMPLE_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024


_SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}


def _fmt_dim(value_m: float, unit: str) -> str:
    """Formats a metres-denominated dimension in the tenant's chosen display unit."""
    if unit == "cm":
        return str(round(value_m * 100))
    return f"{value_m / 0.3048:g}"


def _send_quote_notification(db: Session, quote: Quote, tenant: "Tenant", customer: "Customer") -> None:
    """Fire-and-forget templated email to customer when a quote is sent."""
    to_email: Optional[str] = customer.email if customer else None
    if not to_email:
        return

    currency: str = str(quote.price_currency) if quote.price_currency is not None else "INR"
    sym = _SYMBOLS.get(currency, "")

    rug_name: str = str(quote.rug_catalog.name) if quote.rug_catalog else "Custom Rug Order"

    size_unit = tenant.default_size_unit or "ft"
    w = quote.custom_size_w
    h = quote.custom_size_h
    size_str = f"{_fmt_dim(w, size_unit)}x{_fmt_dim(h, size_unit)} {size_unit}" if w is not None and h is not None else "custom size"

    fp = quote.final_price
    price_str = f"{sym}{fp:,.2f}" if fp is not None else "to be confirmed"

    bp = quote.base_price
    subtotal_str = f"{sym}{bp:,.2f}" if bp is not None else "—"

    gst_pct_str = f"{quote.gst_pct:g}%" if quote.gst_pct is not None else "—"

    discount_pct = quote.manual_discount_pct
    if discount_pct:
        discount_line_html = (
            f'<tr><td style="padding:8px 0;color:#666">Discount</td>'
            f'<td style="padding:8px 0;color:#059669">-{discount_pct:g}%</td></tr>'
        )
        discount_line_text = f"Discount: -{discount_pct:g}%\n"
    else:
        discount_line_html = ""
        discount_line_text = ""

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

    quote_link = f"{settings.FRONTEND_URL}/my-quotes"

    subject, body_text, body_html = email_service.render_template(
        db, quote.tenant_id, "quote_sent",
        {
            "customer_name": customer.name,
            "tenant_name": tenant.name,
            "rug_name": rug_name,
            "size": size_str,
            "qty": qty_str,
            "price": price_str,
            "subtotal": subtotal_str,
            "gst_pct": gst_pct_str,
            "discount_line_html": discount_line_html,
            "discount_line_text": discount_line_text,
            "expected_delivery": delivery_str,
            "note_html": note_html,
            "note_text": note_text,
            "quote_link": quote_link,
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html)


def _send_quote_rejection_notification(db: Session, quote: Quote, tenant: "Tenant", customer: "Customer", reason: Optional[str]) -> None:
    """Fire-and-forget templated email to customer when a vendor declines a quote/request."""
    to_email: Optional[str] = customer.email if customer else None
    if not to_email:
        return

    rug_name: str = str(quote.rug_catalog.name) if quote.rug_catalog else "Custom Rug Request"
    reason_line_html = (
        f'<div style="background:#fef2f2;border-left:3px solid #dc2626;padding:12px 16px;'
        f'margin:16px 0;border-radius:4px"><p style="margin:0;font-size:13px;color:#991b1b">'
        f'<strong>Reason:</strong> {reason}</p></div>'
    ) if reason else ""
    reason_line_text = f"Reason: {reason}\n" if reason else ""
    catalog_link = f"{settings.FRONTEND_URL}/catalog"

    subject, body_text, body_html = email_service.render_template(
        db, quote.tenant_id, "quote_rejected",
        {
            "customer_name": customer.name,
            "tenant_name": tenant.name,
            "rug_name": rug_name,
            "reason_line_html": reason_line_html,
            "reason_line_text": reason_line_text,
            "catalog_link": catalog_link,
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html)

router = APIRouter()


@router.get("/quotes", response_model=QuotePaginatedResponse)
def get_quotes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    status: Optional[str] = None,
    rush_order: Optional[bool] = None,
    is_custom_request: Optional[bool] = None,
    rug_catalog_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    # Filters shared by every status tab — pagination and the per-tab counts below
    # both apply on top of this same base query, so the counts always match what
    # scrolling through each tab would actually return.
    base_q = db.query(Quote).filter(Quote.tenant_id == current_user.tenant_id)

    if rush_order is not None:
        base_q = base_q.filter(Quote.rush_order == rush_order)

    if is_custom_request is not None:
        base_q = base_q.filter(Quote.is_custom_request == is_custom_request)

    if rug_catalog_id is not None:
        base_q = base_q.filter(Quote.rug_catalog_id == rug_catalog_id)

    if search:
        pattern = f"%{search}%"
        base_q = base_q.outerjoin(Customer, Quote.customer_id == Customer.id).outerjoin(
            RugCatalog, Quote.rug_catalog_id == RugCatalog.id
        )
        conditions = [
            Customer.name.ilike(pattern),
            Customer.company.ilike(pattern),
            Customer.email.ilike(pattern),
            RugCatalog.name.ilike(pattern),
        ]
        if search.strip().isdigit():
            conditions.append(Quote.id == int(search.strip()))
        base_q = base_q.filter(or_(*conditions))

    if date_from:
        try:
            base_q = base_q.filter(Quote.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass

    if date_to:
        try:
            base_q = base_q.filter(Quote.created_at <= datetime.fromisoformat(date_to + "T23:59:59"))
        except ValueError:
            pass

    status_counts = {"draft": 0, "sent": 0, "accepted": 0, "rejected": 0}
    for row_status, cnt in base_q.with_entities(Quote.status, func.count(Quote.id)).group_by(Quote.status).all():
        if row_status in status_counts:
            status_counts[row_status] = cnt
    status_counts["all"] = sum(status_counts.values())

    q = base_q
    if status and status != "all":
        q = q.filter(Quote.status == status)

    total = q.count()
    items = (
        q.order_by(Quote.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return QuotePaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
        status_counts=status_counts,
    )


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
    if quote.status in ("accepted", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"This quote is already '{quote.status}' and can no longer be modified. "
                   + ("Use \"Revise & Resend\" to send a new offer instead." if quote.status == "rejected" else "Cancel the order to make changes."),
        )
    update_fields = quote_update.model_dump(exclude_unset=True)
    resulting_status = update_fields.get("status", quote.status)
    resulting_price = update_fields.get("final_price", quote.final_price)
    if resulting_status in ("sent", "accepted") and resulting_price is None:
        raise HTTPException(status_code=400, detail=f"Cannot mark this quote as '{resulting_status}' until a price has been set. Use \"Set Price\" first.")
    became_accepted = resulting_status == "accepted" and quote.status != "accepted"
    for field, value in update_fields.items():
        setattr(quote, field, value)

    # Vendor marking a quote Accepted on the customer's behalf (e.g. they confirmed
    # by phone/WhatsApp) should produce a real, trackable Order — same as a customer
    # accepting it themselves — not just flip a status label with nothing behind it.
    if became_accepted and not quote.order:
        if quote.expected_delivery_days is not None:
            lead_days = int(quote.expected_delivery_days)
        else:
            rug = quote.rug_catalog
            lead_days = (rug.lead_time_days if rug else 21) or 21
            if quote.rush_order:
                lead_days = max(7, lead_days // 2)
        tenant = current_user.tenant
        shipping_cost = (tenant.default_shipping_rate or 0.0) if tenant else 0.0
        order = Order(
            tenant_id=quote.tenant_id,
            quote_id=quote.id,
            status="pending",
            estimated_delivery=datetime.utcnow() + timedelta(days=lead_days),
            shipping_cost=shipping_cost,
            total_amount=round((quote.final_price or 0.0) + shipping_cost, 2),
            price_currency=quote.price_currency,
        )
        db.add(order)

    db.commit()
    db.refresh(quote)
    return quote


@router.patch("/quotes/{quote_id}/reject", response_model=QuoteSchema)
def reject_quote(
    quote_id: int,
    body: QuoteRejectRequest,
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
        raise HTTPException(status_code=400, detail=f"Cannot reject a quote that is already '{quote.status}'")
    quote.status = "rejected"
    if body.reason:
        quote.vendor_notes = body.reason
    db.commit()
    db.refresh(quote)

    customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    if customer and tenant:
        _send_quote_rejection_notification(db, quote, tenant, customer, body.reason)

    return quote


@router.post("/quotes/{quote_id}/revise", response_model=QuoteSchema)
def revise_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Clones a rejected quote into a new draft quote instead of reopening the
    rejected one in place — preserves the rejection (and the customer's stated
    reason) as an immutable record, and lets the vendor send a fresh offer."""
    original = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Quote not found")
    if original.status != "rejected":
        raise HTTPException(status_code=400, detail="Only a rejected quote can be revised — this quote is currently '{}'.".format(original.status))

    existing_revision = db.query(Quote).filter(
        Quote.revised_from_quote_id == original.id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if existing_revision:
        raise HTTPException(status_code=400, detail=f"This quote was already revised into Quote #{existing_revision.id}.")

    revised = Quote(
        tenant_id=original.tenant_id,
        customer_id=original.customer_id,
        rug_catalog_id=original.rug_catalog_id,
        custom_size_w=original.custom_size_w,
        custom_size_h=original.custom_size_h,
        rug_shape=original.rug_shape,
        material_id=original.material_id,
        qty=original.qty,
        rush_order=original.rush_order,
        status="draft",
        notes=original.notes,
        is_custom_request=original.is_custom_request,
        room_type=original.room_type,
        material_preference=original.material_preference,
        budget_range=original.budget_range,
        reference_image_urls=original.reference_image_urls,
        vendor_sample_image_urls=original.vendor_sample_image_urls,
        revised_from_quote_id=original.id,
        # Deliberately NOT copied: final_price/base_price/margin_pct/gst_pct/
        # price_currency/manual_discount_pct (fresh pricing), vendor_notes and
        # customer_response_notes (belong to the rejected quote's history).
    )
    db.add(revised)
    db.commit()
    db.refresh(revised)
    return revised


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


@router.post("/quotes/{quote_id}/adjust/preview", response_model=QuoteCalculateResponse)
def preview_quote_adjustment(
    quote_id: int,
    body: QuoteAdjustRequest,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Computes the material-cost-based price for a custom rug request using the
    vendor's in-progress form values, without saving anything or notifying the
    customer — lets the vendor see the breakdown before committing to Send."""
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if body.material_id is None:
        raise HTTPException(status_code=400, detail="material_id is required to preview a calculation.")

    engine = QuoteEngine(db, tenant_id=current_user.tenant_id)
    result = engine.calculate_custom_quote(
        quote, body.material_id,
        margin_override=body.margin_pct,
        size_w=body.custom_size_w,
        size_h=body.custom_size_h,
        discount_pct=body.manual_discount_pct,
        shape=body.rug_shape,
        shipping_cost=body.shipping_cost,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


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
    if body.material_id is None and body.final_price is None:
        raise HTTPException(status_code=400, detail="Provide either final_price or material_id.")

    # manual_discount_pct — and any size correction — must land on the quote
    # before pricing so a material-based calculation below actually reflects it.
    if body.manual_discount_pct is not None:
        quote.manual_discount_pct = body.manual_discount_pct
    if body.shipping_cost is not None:
        quote.shipping_cost = body.shipping_cost
    if body.custom_size_w is not None:
        quote.custom_size_w = body.custom_size_w
    if body.custom_size_h is not None:
        quote.custom_size_h = body.custom_size_h
    if body.rug_shape is not None:
        quote.rug_shape = body.rug_shape

    if body.material_id is not None:
        # Custom rug request — vendor assigns a material instead of typing a flat
        # price; price it the same margin-over-material-cost way a catalog quote
        # would be, sized to this quote's own custom dimensions.
        engine = QuoteEngine(db, tenant_id=current_user.tenant_id)
        result = engine.calculate_custom_quote(quote, body.material_id, margin_override=body.margin_pct)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        quote.material_id = body.material_id
        quote.margin_pct = result["profit_margin_pct"]
        quote.base_price = result["subtotal"]
        quote.final_price = result["final_price"]
        quote.gst_pct = result["gst_pct"]
        quote.price_currency = result["price_currency"]
    else:
        quote.final_price = body.final_price

    if body.vendor_notes is not None:
        quote.vendor_notes = body.vendor_notes
    # Re-send to customer after adjustment
    quote.status = "sent"
    db.commit()
    db.refresh(quote)

    customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == quote.tenant_id).first()
    if customer and tenant:
        _send_quote_notification(db, quote, tenant, customer)

    return quote


@router.post("/quotes/{quote_id}/sample-images/upload")
async def upload_quote_sample_image(
    quote_id: int,
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Uploads one design sample image for a custom rug request quote. Returns its
    static URL — call PATCH /quotes/{quote_id}/sample-images afterwards to attach
    it (and any others) to the quote."""
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if file.content_type not in SAMPLE_IMAGE_ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.")
    contents = await file.read()
    if len(contents) > SAMPLE_IMAGE_MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(SAMPLE_IMAGE_UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(SAMPLE_IMAGE_UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/static/quote-samples/{filename}"}


@router.patch("/quotes/{quote_id}/sample-images", response_model=QuoteSchema)
def set_quote_sample_images(
    quote_id: int,
    body: QuoteSampleImagesRequest,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Attaches (or clears, with an empty list) the vendor's design sample images
    on a custom rug request quote — shown back to the customer in My Quotes."""
    quote = db.query(Quote).filter(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    quote.vendor_sample_image_urls = body.image_urls
    db.commit()
    db.refresh(quote)
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
