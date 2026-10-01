from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from jose import JWTError, jwt
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.bot_protection import verify_human
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.models import Customer, Order, OrderItem, Quote, RugCatalog, RugReview, StaffUser, Tenant
from app.schemas.schemas import (
    RugReviewAdmin,
    RugReviewCreate,
    RugReviewPublic,
    RugReviewStatusUpdate,
    RugReviewSummary,
)

router = APIRouter()


# ── Storefront ──────────────────────────────────────────────────────────────────

def _public_tenant_rug(db: Session, rug_id: int) -> tuple[Tenant, RugCatalog]:
    tenant = db.query(Tenant).first()
    rug = (
        db.query(RugCatalog)
        .filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == (tenant.id if tenant else None))
        .first()
    )
    if not tenant or not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    return tenant, rug


def _optional_customer(request: Request, db: Session, tenant_id: int) -> Optional[Customer]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth_header.split(" ", 1)[1], settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != "customer" or not payload.get("sub"):
        return None
    return db.query(Customer).filter(Customer.id == int(payload["sub"]), Customer.tenant_id == tenant_id).first()


def _has_ordered_rug(db: Session, tenant_id: int, customer_id: int, rug_id: int) -> bool:
    """A non-cancelled order containing a quote for this rug, placed by this customer."""
    return db.query(Order.id).outerjoin(OrderItem, OrderItem.order_id == Order.id).join(
        Quote, or_(Quote.id == OrderItem.quote_id, Quote.id == Order.quote_id)
    ).filter(
        Order.tenant_id == tenant_id,
        Order.status != "cancelled",
        Quote.customer_id == customer_id,
        Quote.rug_catalog_id == rug_id,
    ).first() is not None


@router.get("/customer/catalog/{rug_id}/reviews", response_model=RugReviewSummary)
def list_rug_reviews(rug_id: int, db: Session = Depends(get_db)):
    tenant, rug = _public_tenant_rug(db, rug_id)
    approved = db.query(RugReview).filter(
        RugReview.tenant_id == tenant.id,
        RugReview.rug_id == rug.id,
        RugReview.status == "approved",
    )
    counts = dict(approved.with_entities(RugReview.rating, func.count(RugReview.id)).group_by(RugReview.rating).all())
    total = sum(counts.values())
    average = round(sum(r * n for r, n in counts.items()) / total, 1) if total else None
    reviews = approved.order_by(RugReview.created_at.desc()).limit(100).all()
    return {
        "average_rating": average,
        "review_count": total,
        "rating_counts": {str(r): counts.get(r, 0) for r in range(5, 0, -1)},
        "reviews": reviews,
    }


def _notify_vendor_new_review(db: Session, review: RugReview, rug: RugCatalog, tenant: Tenant) -> None:
    from app.services import email_service

    to_email = email_service.vendor_recipient(tenant)
    if not to_email:
        return
    subject, body_text, body_html = email_service.render_template(
        db, tenant.id, "vendor_new_review",
        {
            "tenant_name": tenant.name,
            "customer_name": review.name,
            "customer_email": review.email,
            "rug_name": rug.name,
            "rating": review.rating,
            "title": review.title or "(no title)",
            "body": review.body,
            "verified": "Yes" if review.is_verified_buyer else "No",
        },
    )
    email_service.send_email(to_email, subject, body_text, body_html, reply_to=review.email)


@router.post(
    "/customer/catalog/{rug_id}/reviews",
    status_code=201,
    dependencies=[Depends(rate_limit("rug_review", (3, 3600), (10, 86400))), Depends(verify_human)],
)
def create_rug_review(rug_id: int, body: RugReviewCreate, request: Request, db: Session = Depends(get_db)):
    tenant, rug = _public_tenant_rug(db, rug_id)
    customer = _optional_customer(request, db, tenant.id)
    email = (customer.email if customer else str(body.email)).strip().lower()

    already = db.query(RugReview.id).filter(
        RugReview.tenant_id == tenant.id,
        RugReview.rug_id == rug.id,
        func.lower(RugReview.email) == email,
        RugReview.status != "rejected",
    ).first()
    if already:
        raise HTTPException(status_code=409, detail="You've already reviewed this rug — thank you!")

    review = RugReview(
        tenant_id=tenant.id,
        rug_id=rug.id,
        customer_id=customer.id if customer else None,
        name=body.name.strip(),
        email=email,
        rating=body.rating,
        title=(body.title or "").strip() or None,
        body=body.body.strip(),
        status="pending",
        is_verified_buyer=bool(customer and _has_ordered_rug(db, tenant.id, customer.id, rug.id)),
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    try:
        _notify_vendor_new_review(db, review, rug, tenant)
    except Exception:
        pass  # best-effort, same as the other vendor notifications

    return {"message": "Thank you! Your review will appear once it has been approved."}


# ── Admin moderation ────────────────────────────────────────────────────────────

def _to_admin(review: RugReview) -> dict:
    data = RugReviewAdmin.model_validate(review, from_attributes=True).model_dump()
    data["rug_name"] = review.rug.name if review.rug else None
    data["rug_slug"] = review.rug.slug if review.rug else None
    return data


def _tenant_review(db: Session, review_id: int, tenant_id: int) -> RugReview:
    review = db.query(RugReview).filter(RugReview.id == review_id, RugReview.tenant_id == tenant_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.get("/reviews", response_model=List[RugReviewAdmin])
def list_reviews(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    q = db.query(RugReview).filter(RugReview.tenant_id == current_user.tenant_id)
    if status_filter:
        q = q.filter(RugReview.status == status_filter)
    return [_to_admin(r) for r in q.order_by(RugReview.created_at.desc()).limit(500).all()]


@router.patch("/reviews/{review_id}", response_model=RugReviewAdmin)
def update_review_status(
    review_id: int,
    body: RugReviewStatusUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    review = _tenant_review(db, review_id, current_user.tenant_id)
    review.status = body.status
    review.reviewed_at = datetime.now(timezone.utc) if body.status != "pending" else None
    db.commit()
    db.refresh(review)
    return _to_admin(review)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    review = _tenant_review(db, review_id, current_user.tenant_id)
    db.delete(review)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
