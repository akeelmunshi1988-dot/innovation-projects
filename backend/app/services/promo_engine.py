from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from app.models.models import PromoCode, PromoRedemption


class PromoError(Exception):
    """Raised with a customer-facing message — the caller turns this into a 400."""


def find_valid_promo(
    db: Session, tenant_id: Optional[int], code: str, subtotal: float, customer_id: Optional[int] = None,
) -> PromoCode:
    """Looks up a promo code and checks every eligibility rule. Shared by the
    validate endpoint (cart/checkout preview) and the checkout routes themselves
    (authoritative re-check at order-creation time) so the two can never disagree."""
    normalized = code.strip().upper()
    if not normalized:
        raise PromoError("Enter a promo code.")

    promo = (
        db.query(PromoCode)
        .filter(PromoCode.code == normalized, PromoCode.tenant_id == tenant_id)
        .first()
    )
    if not promo or not promo.is_active:
        raise PromoError("This promo code is not valid.")

    now = datetime.now(timezone.utc)
    if promo.starts_at and _aware(promo.starts_at) > now:
        raise PromoError("This promo code is not active yet.")
    if promo.expires_at and _aware(promo.expires_at) < now:
        raise PromoError("This promo code has expired.")

    if promo.min_order_value and subtotal < promo.min_order_value:
        raise PromoError(f"This code requires a minimum order of {promo.min_order_value:.2f}.")

    if promo.max_uses is not None:
        used = db.query(sqlfunc.count(PromoRedemption.id)).filter(PromoRedemption.promo_code_id == promo.id).scalar()
        if used >= promo.max_uses:
            raise PromoError("This promo code has reached its usage limit.")

    if promo.one_per_customer and customer_id is not None:
        already_used = (
            db.query(PromoRedemption)
            .filter(PromoRedemption.promo_code_id == promo.id, PromoRedemption.customer_id == customer_id)
            .first()
        )
        if already_used:
            raise PromoError("You've already used this promo code.")

    return promo


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def compute_discount(promo: PromoCode, subtotal: float, shipping_cost: float = 0.0) -> float:
    if promo.discount_type == "percentage":
        return round(subtotal * ((promo.discount_value or 0) / 100), 2)
    if promo.discount_type == "flat":
        return round(min(promo.discount_value or 0, subtotal), 2)
    return round(shipping_cost, 2)  # free_shipping — discount equals the shipping charge, cancelling it out


def record_redemption(db: Session, promo: PromoCode, discount_amount: float, customer_id: Optional[int], order_id: Optional[int]) -> None:
    db.add(PromoRedemption(
        promo_code_id=promo.id, customer_id=customer_id, order_id=order_id, discount_amount=discount_amount,
    ))
