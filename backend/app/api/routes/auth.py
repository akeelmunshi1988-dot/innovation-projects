import os
import secrets
import uuid
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, UploadFile, File, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.core.cache import cache_get, cache_set, cache_clear
from app.core.auth import (
    hash_password, verify_password, create_access_token, get_current_user, get_current_customer,
    create_refresh_token, rotate_refresh_token, revoke_refresh_token,
)
from app.models.models import Tenant, StaffUser, Customer
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, MeResponse, TenantPublic, TenantUpdateRequest,
    CustomerRegisterRequest, CustomerLoginRequest, CustomerTokenResponse,
    CustomerRegisterResponse, CustomerVerifyEmailRequest, RefreshResponse,
)
from app.services import email_service

router = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )

VERIFICATION_TOKEN_TTL_HOURS = 24

BRANDING_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "branding")
ALLOWED_FAVICON_TYPES = {"image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml", "image/jpeg"}
MAX_FAVICON_SIZE_MB = 2


def _send_verification_email(db: Session, customer: Customer, tenant: Tenant) -> None:
    token = secrets.token_urlsafe(32)
    customer.verification_token = token
    customer.verification_token_expires_at = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_TTL_HOURS)
    customer.is_verified = False

    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject, body_text, body_html = email_service.render_template(
        db, tenant.id, "customer_verification",
        {
            "customer_name": customer.name,
            "tenant_name": tenant.name,
            "verification_link": verification_link,
        },
    )
    email_service.send_email(customer.email, subject, body_text, body_html)


@router.post("/auth/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    # Slug must be unique
    if db.query(Tenant).filter(Tenant.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Slug already taken. Choose a different company identifier.")

    # Email must be unique within... well, it's the first user so just check globally for safety
    existing = db.query(StaffUser).filter(StaffUser.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    tenant = Tenant(
        name=body.company_name,
        slug=body.slug,
        gstin=body.gstin,
        currency=body.currency or "INR",
        base_currency=body.currency or "INR",
        plan="starter",
        plan_status="trial",
        ai_credits_used=0,
        billing_cycle_start=datetime.utcnow(),
    )
    db.add(tenant)
    db.flush()

    user = StaffUser(
        tenant_id=tenant.id,
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    token = create_access_token({"sub": str(user.id)})
    _set_refresh_cookie(response, create_refresh_token(db, "staff", user.id))
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        tenant=TenantPublic.model_validate(tenant),
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.email == body.email, StaffUser.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id)})
    _set_refresh_cookie(response, create_refresh_token(db, "staff", user.id))
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        tenant=TenantPublic.model_validate(user.tenant),
    )


@router.get("/auth/me", response_model=MeResponse)
def me(current_user: StaffUser = Depends(get_current_user)):
    cache_key = str(current_user.tenant_id)
    tenant_public = cache_get("tenant", cache_key)
    if tenant_public is None:
        tenant_public = TenantPublic.model_validate(current_user.tenant)
        cache_set("tenant", tenant_public, cache_key)
    return MeResponse(
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        tenant=tenant_public,
    )


@router.get("/auth/customer/me")
def customer_me(current_customer: Customer = Depends(get_current_customer)):
    return {
        "customer_id": current_customer.id,
        "name": current_customer.name,
        "email": current_customer.email,
    }


@router.post("/auth/customer/register", response_model=CustomerRegisterResponse, status_code=201)
def customer_register(body: CustomerRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.email == body.email).first()
    if existing:
        if existing.hashed_password:
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")
        # Link password to existing unregistered customer record
        existing.hashed_password = hash_password(body.password)
        existing.is_active = True
        if body.name and not existing.name:
            existing.name = body.name
        if body.phone and not existing.phone:
            existing.phone = body.phone
        if body.company and not existing.company:
            existing.company = body.company
        db.commit()
        db.refresh(existing)
        customer = existing
    else:
        customer = Customer(
            name=body.name,
            email=body.email,
            phone=body.phone,
            company=body.company,
            hashed_password=hash_password(body.password),
            is_active=True,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    tenant = db.query(Tenant).filter(Tenant.id == customer.tenant_id).first() or db.query(Tenant).first()
    if tenant:
        _send_verification_email(db, customer, tenant)
        db.commit()

    return CustomerRegisterResponse(
        message="Account created. Please check your email to verify your account before logging in.",
        email=customer.email,
    )


@router.post("/auth/customer/verify-email", response_model=CustomerTokenResponse)
def customer_verify_email(body: CustomerVerifyEmailRequest, response: Response, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.verification_token == body.token).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid or already-used verification link.")
    if not customer.verification_token_expires_at or customer.verification_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This verification link has expired. Please register again to get a new one.")

    customer.is_verified = True
    customer.verification_token = None
    customer.verification_token_expires_at = None
    db.commit()

    token = create_access_token({"sub": str(customer.id), "type": "customer"})
    _set_refresh_cookie(response, create_refresh_token(db, "customer", customer.id))
    return CustomerTokenResponse(access_token=token, customer_id=customer.id, name=customer.name, email=customer.email)


@router.post("/auth/customer/login", response_model=CustomerTokenResponse)
def customer_login(body: CustomerLoginRequest, response: Response, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.email == body.email, Customer.is_active == True).first()
    if not customer or not customer.hashed_password or not verify_password(body.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not customer.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in. Check your inbox for the verification link.")

    token = create_access_token({"sub": str(customer.id), "type": "customer"})
    _set_refresh_cookie(response, create_refresh_token(db, "customer", customer.id))
    return CustomerTokenResponse(access_token=token, customer_id=customer.id, name=customer.name, email=customer.email)


@router.post("/auth/refresh", response_model=RefreshResponse)
def refresh(response: Response, db: Session = Depends(get_db), refresh_token: Optional[str] = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    user_type, user_id, new_raw_token = rotate_refresh_token(db, refresh_token)
    _set_refresh_cookie(response, new_raw_token)

    token = create_access_token({"sub": str(user_id), **({"type": "customer"} if user_type == "customer" else {})})
    return RefreshResponse(access_token=token)


@router.post("/auth/logout")
def logout(response: Response, db: Session = Depends(get_db), refresh_token: Optional[str] = Cookie(None)):
    if refresh_token:
        revoke_refresh_token(db, refresh_token)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return {"message": "Logged out"}


@router.patch("/tenant/settings", response_model=TenantPublic)
def update_tenant_settings(
    body: TenantUpdateRequest,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if body.name is not None:
        tenant.name = body.name
    if body.currency is not None:
        tenant.currency = body.currency
    if body.exchange_rates is not None:
        # Validate: all values must be positive floats, keys must be valid currency codes
        for code, rate in body.exchange_rates.items():
            if not isinstance(rate, (int, float)) or rate <= 0:
                raise HTTPException(status_code=422, detail=f"Rate for {code} must be a positive number.")
        tenant.exchange_rates = body.exchange_rates
    if body.gstin is not None:
        tenant.gstin = body.gstin
    if body.default_profit_margin_pct is not None:
        tenant.default_profit_margin_pct = body.default_profit_margin_pct
    if body.rush_surcharge_pct is not None:
        tenant.rush_surcharge_pct = body.rush_surcharge_pct
    if body.large_format_threshold_sqm is not None:
        tenant.large_format_threshold_sqm = body.large_format_threshold_sqm
    if body.large_format_surcharge_pct is not None:
        tenant.large_format_surcharge_pct = body.large_format_surcharge_pct
    if body.state_code is not None:
        tenant.state_code = body.state_code
    if body.address is not None:
        tenant.address = body.address
    if body.lut_number is not None:
        tenant.lut_number = body.lut_number
    if body.ai_assistant_customer_enabled is not None:
        tenant.ai_assistant_customer_enabled = body.ai_assistant_customer_enabled
    if body.ai_assistant_vendor_enabled is not None:
        tenant.ai_assistant_vendor_enabled = body.ai_assistant_vendor_enabled
    if body.vendor_notification_email is not None:
        tenant.vendor_notification_email = body.vendor_notification_email
    if body.default_size_unit is not None:
        tenant.default_size_unit = body.default_size_unit
    if body.contact_emails is not None:
        tenant.contact_emails = body.contact_emails
    if body.contact_phones is not None:
        tenant.contact_phones = body.contact_phones
    if body.contact_address is not None:
        tenant.contact_address = body.contact_address
    if body.contact_hours is not None:
        tenant.contact_hours = body.contact_hours
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")  # /customer/settings mirrors business_name/logo_url/contact fields from this same tenant row
    return TenantPublic.model_validate(tenant)


@router.post("/tenant/favicon", response_model=TenantPublic)
async def upload_tenant_favicon(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_FAVICON_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use PNG, ICO, JPEG, or SVG.")

    contents = await file.read()
    if len(contents) > MAX_FAVICON_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FAVICON_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.logo_url = f"/static/branding/{filename}"
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")
    return TenantPublic.model_validate(tenant)
