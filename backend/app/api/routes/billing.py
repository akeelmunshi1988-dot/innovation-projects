from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import hmac
import hashlib
import json

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Tenant, StaffUser
from app.core.config import settings

router = APIRouter()

# ── Plan catalogue ────────────────────────────────────────────────────────────

PLANS = {
    "starter": {
        "id": "starter",
        "name": "Karigar",
        "name_en": "Starter",
        "tagline": "Solo craftsman · Bhadohi ready",
        "price_inr": 999,
        "price_paise": 99900,
        "ai_credits": 200,
        "staff_users": 1,
        "catalog_items": 50,
        "features": [
            "1 staff login",
            "50 catalog designs",
            "200 AI queries / month",
            "Customer shop widget",
            "Quote builder",
            "Basic analytics",
            "UPI · Cards · Net Banking",
            "Email support",
        ],
        "not_included": ["Room visualizer", "Team logins", "White-label portal", "API access"],
    },
    "growth": {
        "id": "growth",
        "name": "Vyapar",
        "name_en": "Growth",
        "tagline": "Growing workshop · Export orders",
        "price_inr": 2999,
        "price_paise": 299900,
        "ai_credits": 1000,
        "staff_users": 5,
        "catalog_items": -1,
        "features": [
            "5 staff logins",
            "Unlimited catalog designs",
            "1,000 AI queries / month",
            "Customer shop + Room visualizer",
            "Advanced analytics dashboard",
            "Export orders tracking",
            "Priority support (Hindi + English)",
            "GST invoice on every payment",
        ],
        "not_included": ["White-label portal", "API access", "Dedicated manager"],
    },
    "pro": {
        "id": "pro",
        "name": "Udyog",
        "name_en": "Enterprise",
        "tagline": "Large manufacturer · Multi-facility",
        "price_inr": 7999,
        "price_paise": 799900,
        "ai_credits": -1,
        "staff_users": -1,
        "catalog_items": -1,
        "features": [
            "Unlimited staff logins",
            "Unlimited catalog designs",
            "Unlimited AI queries",
            "White-label customer portal",
            "Full API access",
            "Dedicated account manager",
            "Multi-facility support",
            "SLA guarantee",
            "Custom integrations",
        ],
        "not_included": [],
    },
}


@router.get("/billing/plans")
def get_plans():
    return list(PLANS.values())


@router.get("/billing/status")
def billing_status(
    current_user: StaffUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    plan = PLANS.get(tenant.plan, PLANS["starter"])
    ai_limit = plan["ai_credits"]
    ai_used = tenant.ai_credits_used or 0

    return {
        "plan": tenant.plan,
        "plan_name": plan["name"],
        "plan_name_en": plan["name_en"],
        "plan_status": tenant.plan_status or "trial",
        "price_inr": plan["price_inr"],
        "ai_credits_used": ai_used,
        "ai_credits_limit": ai_limit,
        "ai_credits_pct": min(100, round(ai_used / ai_limit * 100)) if ai_limit > 0 else 0,
        "staff_users_limit": plan["staff_users"],
        "catalog_items_limit": plan["catalog_items"],
        "razorpay_subscription_id": tenant.razorpay_subscription_id,
        "billing_cycle_start": tenant.billing_cycle_start,
        "features": plan["features"],
    }


# ── Subscription creation ─────────────────────────────────────────────────────

class CreateSubscriptionRequest(BaseModel):
    plan: str


@router.post("/billing/create-subscription")
def create_subscription(
    body: CreateSubscriptionRequest,
    current_user: StaffUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env",
        )

    plan_config = PLANS.get(body.plan)
    if not plan_config:
        raise HTTPException(status_code=400, detail="Invalid plan")

    import razorpay  # lazy import — only needed when keys are set

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    try:
        rzp_plan = client.plan.create({
            "period": "monthly",
            "interval": 1,
            "item": {
                "name": f"LoomCraftRugs AI {plan_config['name']}",
                "amount": plan_config["price_paise"],
                "currency": "INR",
                "description": f"{plan_config['name']} Plan — {plan_config['tagline']}",
            },
            "notes": {"loomcraft_plan": body.plan},
        })

        subscription = client.subscription.create({
            "plan_id": rzp_plan["id"],
            "customer_notify": 1,
            "total_count": 12,
            "notes": {
                "tenant_id": str(tenant.id),
                "tenant_name": tenant.name,
                "plan": body.plan,
            },
        })

        tenant.razorpay_subscription_id = subscription["id"]
        db.commit()

        return {
            "subscription_id": subscription["id"],
            "key_id": settings.RAZORPAY_KEY_ID,
            "amount": plan_config["price_paise"],
            "currency": "INR",
            "plan": body.plan,
            "plan_name": plan_config["name"],
            "description": f"LoomCraftRugs AI {plan_config['name']} — ₹{plan_config['price_inr']}/month",
            "prefill": {
                "name": current_user.full_name or current_user.email,
                "email": current_user.email,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {str(e)}")


# ── Payment verification ──────────────────────────────────────────────────────

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    plan: str


@router.post("/billing/verify-payment")
def verify_payment(
    body: VerifyPaymentRequest,
    current_user: StaffUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")

    generated_sig = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=f"{body.razorpay_payment_id}|{body.razorpay_subscription_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(generated_sig, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    tenant.plan = body.plan
    tenant.plan_status = "active"
    tenant.razorpay_subscription_id = body.razorpay_subscription_id
    tenant.billing_cycle_start = datetime.utcnow()
    tenant.ai_credits_used = 0
    db.commit()

    plan_config = PLANS.get(body.plan, PLANS["starter"])
    return {
        "success": True,
        "plan": body.plan,
        "plan_name": plan_config["name"],
        "message": f"Successfully activated {plan_config['name']} plan!",
    }


# ── Razorpay webhook ──────────────────────────────────────────────────────────

@router.post("/billing/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body_bytes = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if settings.RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(
            key=settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            msg=body_bytes,
            digestmod=hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = json.loads(body_bytes)
    event_type = event.get("event", "")
    sub_entity = event.get("payload", {}).get("subscription", {}).get("entity", {})

    if event_type in ("subscription.activated", "subscription.charged"):
        tenant_id = sub_entity.get("notes", {}).get("tenant_id")
        plan = sub_entity.get("notes", {}).get("plan")
        if tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == int(tenant_id)).first()
            if tenant:
                tenant.plan_status = "active"
                if plan and plan in PLANS:
                    tenant.plan = plan
                if event_type == "subscription.charged":
                    tenant.ai_credits_used = 0
                    tenant.billing_cycle_start = datetime.utcnow()
                db.commit()

    elif event_type == "subscription.cancelled":
        sub_id = sub_entity.get("id")
        tenant = db.query(Tenant).filter(Tenant.razorpay_subscription_id == sub_id).first()
        if tenant:
            tenant.plan_status = "cancelled"
            db.commit()

    elif event_type in ("subscription.pending", "payment.failed"):
        sub_id = sub_entity.get("id")
        if sub_id:
            tenant = db.query(Tenant).filter(Tenant.razorpay_subscription_id == sub_id).first()
            if tenant:
                tenant.plan_status = "past_due"
                db.commit()

    return {"received": True}


# ── Cancel subscription ───────────────────────────────────────────────────────

@router.post("/billing/cancel")
def cancel_subscription(
    current_user: StaffUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant.razorpay_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription found")

    try:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        client.subscription.cancel(tenant.razorpay_subscription_id, {"cancel_at_cycle_end": 1})
        tenant.plan_status = "cancelled"
        db.commit()
        return {"success": True, "message": "Subscription cancelled. Access continues until end of billing period."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cancellation error: {str(e)}")
