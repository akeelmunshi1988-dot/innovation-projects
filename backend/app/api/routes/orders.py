import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.models import Order, OrderStatusHistory, Quote, StaffUser, Customer, RugCatalog
from app.schemas.schemas import OrderCreate, OrderUpdate, Order as OrderSchema
from app.services.quote_engine import QuoteEngine, build_manual_price_result

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_STATUSES = ["pending", "in_production", "quality_check", "shipped", "delivered", "cancelled"]


@router.get("/orders", response_model=List[OrderSchema])
def get_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    query = db.query(Order).filter(Order.tenant_id == current_user.tenant_id)
    if status:
        query = query.filter(Order.status == status)
    if search:
        pattern = f"%{search}%"
        query = (
            query
            .outerjoin(Quote, Order.quote_id == Quote.id)
            .outerjoin(Customer, Quote.customer_id == Customer.id)
            .outerjoin(RugCatalog, Quote.rug_catalog_id == RugCatalog.id)
            .filter(or_(
                Customer.name.ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.company.ilike(pattern),
                RugCatalog.name.ilike(pattern),
            ))
        )
    return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/orders/{order_id}", response_model=OrderSchema)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/orders", response_model=OrderSchema)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    quote = db.query(Quote).filter(
        Quote.id == order.quote_id,
        Quote.tenant_id == current_user.tenant_id,
    ).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if order.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    order_data = order.model_dump()
    if order_data.get("shipping_cost") is None:
        order_data["shipping_cost"] = (current_user.tenant.default_shipping_rate or 0.0) if current_user.tenant else 0.0

    db_order = Order(
        **order_data,
        tenant_id=current_user.tenant_id,
        total_amount=round((quote.final_price or 0.0) + order_data["shipping_cost"], 2),
        price_currency=quote.price_currency,
    )
    db.add(db_order)
    quote.status = "accepted"
    db.commit()
    db.refresh(db_order)
    return db_order


@router.put("/orders/{order_id}", response_model=OrderSchema)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order_update.status and order_update.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    for field, value in order_update.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/orders/{order_id}/status", response_model=OrderSchema)
def update_order_status(
    order_id: int,
    status: str,
    shipping_cost: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    if status == "cancelled":
        raise HTTPException(status_code=400, detail="Use POST /orders/{order_id}/cancel to cancel an order — it checks the cancellation window and issues a refund.")
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    old_status = order.status
    order.status = status
    if shipping_cost is not None:
        order.shipping_cost = shipping_cost
    if status != old_status:
        db.add(OrderStatusHistory(order_id=order.id, status=status))
    db.commit()
    db.refresh(order)
    return order


def _order_paid_amount(order: Order) -> float:
    """Total actually charged for this order — used as the refund amount. Prefers the
    total_amount snapshot frozen at order-creation time (immune to the linked quote(s)
    being revised/re-priced later); falls back to a live recompute from the linked
    quotes for orders created before that snapshot existed."""
    if order.total_amount is not None:
        return max(0.0, round(order.total_amount, 2))
    line_quotes = [oi.quote for oi in order.items if oi.quote] or ([order.quote] if order.quote else [])
    subtotal = sum(lq.final_price for lq in line_quotes if lq.final_price is not None)
    total = subtotal + (order.shipping_cost or 0.0) - (order.discount_amount or 0.0)
    return max(0.0, round(total, 2))


@router.get("/orders/{order_id}/cancel-eligibility")
def get_cancel_eligibility(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Lets the UI show/gray the Cancel button and preview the refund amount before
    the vendor commits to it — the actual cancel endpoint re-checks everything itself."""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    tenant = current_user.tenant
    window_hours = (tenant.cancellation_window_hours or 24) if tenant else 24
    created_at = order.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600 if created_at else 0.0
    within_window = age_hours <= window_hours

    already_cancelled = order.status == "cancelled"
    return {
        "eligible": within_window and not already_cancelled,
        "already_cancelled": already_cancelled,
        "window_hours": window_hours,
        "hours_remaining": max(0.0, round(window_hours - age_hours, 1)) if not already_cancelled else 0.0,
        "has_payment": bool(order.razorpay_payment_id),
        "refund_amount": _order_paid_amount(order) if order.razorpay_payment_id else 0.0,
        "price_currency": (order.quote.price_currency if order.quote else None) or (tenant.base_currency if tenant else "INR"),
    }


@router.post("/orders/{order_id}/cancel", response_model=OrderSchema)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Cancels an order, refunding the full amount via Razorpay if it was paid for
    online. Enforces the tenant's cancellation window server-side regardless of what
    the UI already showed — never trusts the client on eligibility or amount."""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled")

    tenant = current_user.tenant
    window_hours = (tenant.cancellation_window_hours or 24) if tenant else 24
    created_at = order.created_at
    if created_at and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_hours = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600 if created_at else 0.0
    if age_hours > window_hours:
        raise HTTPException(
            status_code=400,
            detail=f"This order was placed more than {window_hours} hours ago and is no longer eligible for cancellation.",
        )

    if order.razorpay_payment_id:
        amount = _order_paid_amount(order)
        if amount > 0:
            if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
                raise HTTPException(status_code=503, detail="Payment gateway not configured — cannot process refund.")
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            try:
                refund = client.payment.refund(order.razorpay_payment_id, {
                    "amount": int(round(amount * 100)),
                    "speed": "optimum",
                    "notes": {"order_id": str(order.id), "reason": "Order cancelled by vendor"},
                })
            except Exception as e:
                logger.warning("Razorpay refund failed for order %s: %s", order.id, e)
                raise HTTPException(status_code=502, detail=f"Refund could not be processed: {e}")
            order.refund_id = refund.get("id")
            order.refund_status = refund.get("status") or "processed"
            order.refund_amount = amount
            order.refunded_at = datetime.now(timezone.utc)

    order.status = "cancelled"
    db.add(OrderStatusHistory(order_id=order.id, status="cancelled"))
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders/{order_id}/breakdown")
def get_order_breakdown(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    quote = order.quote
    if not quote:
        raise HTTPException(status_code=422, detail="Order has no associated quote")

    if quote.rug_catalog_id and quote.material_id:
        if not quote.custom_size_w or not quote.custom_size_h:
            raise HTTPException(status_code=422, detail="Order quote is missing size information")

        engine = QuoteEngine(db, tenant_id=current_user.tenant_id)
        result = engine.calculate_quote(
            rug_id=quote.rug_catalog_id,
            size_w=quote.custom_size_w,
            size_h=quote.custom_size_h,
            material_id=quote.material_id,
            qty=quote.qty or 1,
            rush_order=bool(quote.rush_order),
            margin_override=quote.margin_pct,   # use rate locked at order time
            gst_override=quote.gst_pct,         # use rate locked at order time
        )

        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
    elif quote.material_id:
        # Custom rug request with a material assigned (via Adjust Price and Material) —
        # no catalog rug, so price it via margin-over-material-cost instead.
        engine = QuoteEngine(db, tenant_id=current_user.tenant_id)
        result = engine.calculate_custom_quote(quote, quote.material_id, margin_override=quote.margin_pct)
        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
    else:
        # Custom rug request priced with a flat vendor-typed number, no material
        # assigned — no cost basis to recompute from at all.
        result = build_manual_price_result(quote, current_user.tenant)

    return {
        **result,
        "stored_final_price": quote.final_price,
        "price_currency": quote.price_currency or result.get("price_currency", "INR"),
        "customer_country": quote.customer.country if quote.customer else None,
        "shipping_address": order.shipping_address,
        "margin_locked": quote.margin_pct is not None,
        "gst_locked": quote.gst_pct is not None,
    }


@router.delete("/orders/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"message": "Order deleted successfully"}
