from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Order, Quote, Material, StaffUser, Tenant
from app.schemas.schemas import DashboardStats

router = APIRouter()

LOW_STOCK_THRESHOLD = 50.0


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    tid = current_user.tenant_id

    tenant = db.query(Tenant).filter(Tenant.id == tid).first()
    base_currency = (tenant.base_currency or "INR") if tenant else "INR"
    rates = (tenant.exchange_rates or {}) if tenant else {}

    def _to_base(price: float, currency: str | None) -> float:
        if not currency or currency == base_currency:
            return price
        rate = rates.get(currency)
        return price / rate if rate else price

    total_orders = db.query(Order).filter(Order.tenant_id == tid).count()

    accepted_quotes = db.query(Quote).filter(
        Quote.tenant_id == tid,
        Quote.status == "accepted",
    ).all()
    total_revenue = sum(_to_base(q.final_price or 0, q.price_currency) for q in accepted_quotes)

    active_quotes = db.query(Quote).filter(
        Quote.tenant_id == tid,
        Quote.status.in_(["draft", "sent"]),
    ).count()

    low_stock_materials = db.query(Material).filter(
        Material.tenant_id == tid,
        Material.stock_meters < LOW_STOCK_THRESHOLD,
    ).count()

    orders_in_production = db.query(Order).filter(
        Order.tenant_id == tid,
        Order.status == "in_production",
    ).count()

    orders_pending = db.query(Order).filter(
        Order.tenant_id == tid,
        Order.status == "pending",
    ).count()

    recent_orders_raw = (
        db.query(Order)
        .filter(Order.tenant_id == tid)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )
    recent_orders = []
    for o in recent_orders_raw:
        quote = o.quote
        recent_orders.append({
            "id": o.id,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "estimated_delivery": o.estimated_delivery.isoformat() if o.estimated_delivery else None,
            "customer_name": quote.customer.name if quote and quote.customer else None,
            "rug_name": quote.rug_catalog.name if quote and quote.rug_catalog else None,
            "final_price": quote.final_price if quote else None,
            "price_currency": quote.price_currency if quote else None,
        })

    recent_quotes_raw = (
        db.query(Quote)
        .filter(Quote.tenant_id == tid)
        .order_by(Quote.created_at.desc())
        .limit(5)
        .all()
    )
    recent_quotes = [
        {
            "id": q.id,
            "status": q.status,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "customer_name": q.customer.name if q.customer else None,
            "rug_name": q.rug_catalog.name if q.rug_catalog else None,
            "final_price": q.final_price,
            "price_currency": q.price_currency,
            "qty": q.qty,
        }
        for q in recent_quotes_raw
    ]

    now = datetime.utcnow()
    monthly_revenue = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        month_end = (month_start + timedelta(days=31)).replace(day=1)
        month_quotes = db.query(Quote).filter(
            Quote.tenant_id == tid,
            Quote.status == "accepted",
            Quote.created_at >= month_start,
            Quote.created_at < month_end,
        ).all()
        monthly_revenue.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": round(sum(_to_base(q.final_price or 0, q.price_currency) for q in month_quotes), 2),
            "orders": len(month_quotes),
        })

    return DashboardStats(
        total_orders=total_orders,
        total_revenue=round(total_revenue, 2),
        active_quotes=active_quotes,
        low_stock_materials=low_stock_materials,
        orders_in_production=orders_in_production,
        orders_pending=orders_pending,
        recent_orders=recent_orders,
        recent_quotes=recent_quotes,
        monthly_revenue=monthly_revenue,
    )
