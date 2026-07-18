from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Order, Quote, StaffUser, Customer, RugCatalog
from app.schemas.schemas import OrderCreate, OrderUpdate, Order as OrderSchema
from app.services.quote_engine import QuoteEngine

router = APIRouter()

VALID_STATUSES = ["pending", "in_production", "quality_check", "shipped", "delivered"]


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

    db_order = Order(**order.model_dump(), tenant_id=current_user.tenant_id)
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
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == current_user.tenant_id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
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
    if not quote or not quote.rug_catalog_id or not quote.material_id:
        raise HTTPException(status_code=422, detail="Order quote is missing required fields for calculation")

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

    return {
        **result,
        "stored_final_price": quote.final_price,
        "price_currency": quote.price_currency or result.get("price_currency", "INR"),
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
