import os
import secrets
import uuid
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, UploadFile, File, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

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
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.services import email_service
from app.services import oauth_providers
from app.services.fx_rates import fetch_live_rates
from app.api.routes.customer import _is_export_country

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
RESET_TOKEN_TTL_HOURS = 1

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


@router.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.email == body.email, StaffUser.is_active == True).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_TTL_HOURS)
        reset_link = f"{settings.FRONTEND_URL}/admin/reset-password/{token}"
        subject, body_text, body_html = email_service.render_template(
            db, user.tenant_id, "staff_password_reset",
            {"staff_name": user.full_name or user.email, "tenant_name": user.tenant.name, "reset_link": reset_link},
        )
        email_service.send_email(user.email, subject, body_text, body_html)
        db.commit()
    # Same response whether or not the email exists — don't reveal account existence.
    return {"message": "If an account exists with that email, a password reset link has been sent."}


@router.post("/auth/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.reset_token == body.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or already-used reset link.")
    if not user.reset_token_expires_at or user.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    user.hashed_password = hash_password(body.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    return {"message": "Password updated. You can now sign in with your new password."}


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
        "country": current_customer.country,
    }


@router.post("/auth/customer/register", response_model=CustomerRegisterResponse, status_code=201)
def customer_register(body: CustomerRegisterRequest, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    tenant_id = tenant.id if tenant else None
    existing = db.query(Customer).filter(Customer.email == body.email, Customer.tenant_id == tenant_id).first()
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
        if body.account_type:
            existing.account_type = body.account_type
        existing.country = body.country
        existing.is_export_buyer = _is_export_country(body.country)
        db.commit()
        db.refresh(existing)
        customer = existing
    else:
        customer = Customer(
            tenant_id=tenant_id,
            name=body.name,
            email=body.email,
            phone=body.phone,
            company=body.company,
            country=body.country,
            is_export_buyer=_is_export_country(body.country),
            account_type=body.account_type or "retail",
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
    return CustomerTokenResponse(access_token=token, customer_id=customer.id, name=customer.name, email=customer.email, country=customer.country)


@router.post("/auth/customer/login", response_model=CustomerTokenResponse)
def customer_login(body: CustomerLoginRequest, response: Response, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.email == body.email, Customer.is_active == True).first()
    if not customer or not customer.hashed_password or not verify_password(body.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not customer.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in. Check your inbox for the verification link.")

    token = create_access_token({"sub": str(customer.id), "type": "customer"})
    _set_refresh_cookie(response, create_refresh_token(db, "customer", customer.id))
    return CustomerTokenResponse(access_token=token, customer_id=customer.id, name=customer.name, email=customer.email, country=customer.country)


@router.post("/auth/customer/forgot-password")
def customer_forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.email == body.email, Customer.is_active == True).first()
    # hashed_password is null for portal-only/guest records (never registered with a
    # password) and for OAuth-only accounts — nothing to reset in either case.
    if customer and customer.hashed_password:
        token = secrets.token_urlsafe(32)
        customer.reset_token = token
        customer.reset_token_expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_TTL_HOURS)
        tenant = db.query(Tenant).filter(Tenant.id == customer.tenant_id).first() or db.query(Tenant).first()
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
        subject, body_text, body_html = email_service.render_template(
            db, customer.tenant_id, "customer_password_reset",
            {"customer_name": customer.name, "tenant_name": tenant.name if tenant else "", "reset_link": reset_link},
        )
        email_service.send_email(customer.email, subject, body_text, body_html)
        db.commit()
    # Same response whether or not the email exists / has a password — don't reveal account state.
    return {"message": "If an account exists with that email, a password reset link has been sent."}


@router.post("/auth/customer/reset-password")
def customer_reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.reset_token == body.token).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid or already-used reset link.")
    if not customer.reset_token_expires_at or customer.reset_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    customer.hashed_password = hash_password(body.new_password)
    customer.reset_token = None
    customer.reset_token_expires_at = None
    db.commit()
    return {"message": "Password updated. You can now sign in with your new password."}


# ── Social login (Google / Facebook / LinkedIn) ───────────────────────────────

@router.get("/auth/customer/oauth/providers")
def oauth_configured_providers():
    """Which social login buttons the storefront should actually show — providers
    without a Client ID/Secret configured are omitted rather than shown broken."""
    return {"providers": oauth_providers.configured_providers()}


@router.get("/auth/customer/oauth/{provider}/start")
def oauth_start(provider: str, return_to: Optional[str] = None):
    if not oauth_providers.is_configured(provider):
        raise HTTPException(status_code=503, detail=f"{provider.capitalize()} sign-in isn't configured yet.")
    state = oauth_providers.start_state(return_to)
    return RedirectResponse(oauth_providers.build_authorize_url(provider, state))


@router.get("/auth/customer/oauth/{provider}/callback")
def oauth_callback(
    provider: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    frontend_error = f"{settings.FRONTEND_URL.rstrip('/')}/oauth-callback?error="

    if error:
        return RedirectResponse(f"{frontend_error}{error}")
    if not code or not state:
        return RedirectResponse(f"{frontend_error}missing_code")

    return_to = oauth_providers.consume_state(state)
    if return_to is None:
        return RedirectResponse(f"{frontend_error}invalid_state")

    try:
        access_token = oauth_providers.exchange_code(provider, code)
        identity = oauth_providers.fetch_identity(provider, access_token)
    except Exception:
        return RedirectResponse(f"{frontend_error}provider_error")

    email = identity.get("email")
    if not email:
        return RedirectResponse(f"{frontend_error}no_email")
    if not identity.get("email_verified"):
        # Never trust an unverified provider email to find-or-link a Customer — this
        # lookup is by email alone, including accounts that already have a password,
        # so an unverified email would otherwise be a way into someone else's account.
        return RedirectResponse(f"{frontend_error}email_not_verified")

    tenant = db.query(Tenant).first()
    tenant_id = tenant.id if tenant else None

    customer = db.query(Customer).filter(Customer.email == email, Customer.tenant_id == tenant_id).first()
    if customer:
        # Link this provider to an existing (possibly password- or guest-created) account
        if not customer.oauth_provider:
            customer.oauth_provider = provider
            customer.oauth_id = identity.get("provider_user_id")
        customer.is_verified = True
        customer.is_active = True
    else:
        customer = Customer(
            tenant_id=tenant_id,
            name=identity.get("name") or email,
            email=email,
            oauth_provider=provider,
            oauth_id=identity.get("provider_user_id"),
            is_active=True,
            is_verified=True,  # the provider already verified this email
        )
        db.add(customer)
    db.commit()
    db.refresh(customer)

    redirect_url = f"{settings.FRONTEND_URL.rstrip('/')}/oauth-callback?return_to={return_to}"
    redirect_response = RedirectResponse(redirect_url)
    # No access token is placed in the URL — a query-string JWT would land in browser
    # history and server access logs. Instead only the httpOnly refresh cookie is set
    # here; the frontend exchanges it for an access token via POST /auth/refresh, the
    # same mechanism already used for silent session resume.
    # Cookies must be set on the response object actually returned — setting them on the
    # injected `response` param has no effect once we return a different RedirectResponse.
    _set_refresh_cookie(redirect_response, create_refresh_token(db, "customer", customer.id))
    return redirect_response


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
        tenant.exchange_rates_updated_at = datetime.now(timezone.utc)
    if body.exchange_rates_auto is not None:
        tenant.exchange_rates_auto = body.exchange_rates_auto
    if body.enabled_currencies is not None:
        tenant.enabled_currencies = list(dict.fromkeys(code.upper() for code in body.enabled_currencies))
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
    if body.gst_inclusive is not None:
        tenant.gst_inclusive = body.gst_inclusive
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
    if body.catalog_pdf_url is not None:
        tenant.catalog_pdf_url = body.catalog_pdf_url
    if body.hero_image_url is not None:
        tenant.hero_image_url = body.hero_image_url or None
    if body.hero_images is not None:
        cleaned_images = []
        for item in body.hero_images[:12]:
            url = str(item.get("image_url", "")).strip()
            if url:
                cleaned_images.append({
                    "image_url": url,
                    "alt_text": str(item.get("alt_text", ""))[:200],
                    "eyebrow": str(item.get("eyebrow", ""))[:100],
                    "headline": str(item.get("headline", ""))[:200],
                    "button_text": str(item.get("button_text", ""))[:50],
                })
        tenant.hero_images = cleaned_images
    if body.hero_eyebrow is not None:
        tenant.hero_eyebrow = body.hero_eyebrow or None
    if body.hero_heading is not None:
        tenant.hero_heading = body.hero_heading or None
    if body.hero_cta_label is not None:
        tenant.hero_cta_label = body.hero_cta_label or None
    if body.homepage_full_bleed_image_url is not None:
        tenant.homepage_full_bleed_image_url = body.homepage_full_bleed_image_url or None
    if body.homepage_full_bleed_alt_text is not None:
        tenant.homepage_full_bleed_alt_text = body.homepage_full_bleed_alt_text or None
    if body.homepage_full_bleed_enabled is not None:
        tenant.homepage_full_bleed_enabled = body.homepage_full_bleed_enabled
    if body.homepage_values_eyebrow is not None:
        tenant.homepage_values_eyebrow = body.homepage_values_eyebrow or None
    if body.homepage_values_headline is not None:
        tenant.homepage_values_headline = body.homepage_values_headline or None
    if body.homepage_values_headline_accent is not None:
        tenant.homepage_values_headline_accent = body.homepage_values_headline_accent or None
    if body.homepage_values_description is not None:
        tenant.homepage_values_description = body.homepage_values_description or None
    if body.homepage_values_items is not None:
        cleaned_values = []
        for item in body.homepage_values_items[:6]:
            title = str(item.get("title", "")).strip()[:100]
            if title:
                cleaned_values.append({
                    "icon": str(item.get("icon", "scissors"))[:30],
                    "title": title,
                    "description": str(item.get("description", "")).strip()[:300],
                })
        tenant.homepage_values_items = cleaned_values
    if body.homepage_values_enabled is not None:
        tenant.homepage_values_enabled = body.homepage_values_enabled
    if body.homepage_intro_title_line_one is not None:
        tenant.homepage_intro_title_line_one = body.homepage_intro_title_line_one or None
    if body.homepage_intro_title_line_two is not None:
        tenant.homepage_intro_title_line_two = body.homepage_intro_title_line_two or None
    if body.homepage_intro_label is not None:
        tenant.homepage_intro_label = body.homepage_intro_label or None
    if body.homepage_intro_description is not None:
        tenant.homepage_intro_description = body.homepage_intro_description or None
    if body.homepage_intro_cta_label is not None:
        tenant.homepage_intro_cta_label = body.homepage_intro_cta_label or None
    if body.homepage_intro_cta_url is not None:
        tenant.homepage_intro_cta_url = body.homepage_intro_cta_url or None
    if body.homepage_intro_trusted_by_text is not None:
        tenant.homepage_intro_trusted_by_text = body.homepage_intro_trusted_by_text.strip() or None
    if body.homepage_intro_enabled is not None:
        tenant.homepage_intro_enabled = body.homepage_intro_enabled
    if body.homepage_contact_image_url is not None:
        tenant.homepage_contact_image_url = body.homepage_contact_image_url or None
    if body.homepage_contact_image_alt is not None:
        tenant.homepage_contact_image_alt = body.homepage_contact_image_alt or None
    if body.homepage_contact_heading is not None:
        tenant.homepage_contact_heading = body.homepage_contact_heading or None
    if body.homepage_contact_consent_text is not None:
        tenant.homepage_contact_consent_text = body.homepage_contact_consent_text or None
    if body.homepage_contact_button_label is not None:
        tenant.homepage_contact_button_label = body.homepage_contact_button_label or None
    if body.homepage_contact_success_message is not None:
        tenant.homepage_contact_success_message = body.homepage_contact_success_message or None
    if body.homepage_contact_enabled is not None:
        tenant.homepage_contact_enabled = body.homepage_contact_enabled
    if body.refund_cancellation_policy_html is not None:
        tenant.refund_cancellation_policy_html = body.refund_cancellation_policy_html or None
    if body.privacy_policy_html is not None:
        tenant.privacy_policy_html = body.privacy_policy_html or None
    if body.default_catalog_additional_information_html is not None:
        tenant.default_catalog_additional_information_html = body.default_catalog_additional_information_html or None
    if body.rug_sample_information_html is not None:
        tenant.rug_sample_information_html = body.rug_sample_information_html or None
    if body.rug_care_advice_html is not None:
        tenant.rug_care_advice_html = body.rug_care_advice_html or None
    if body.rug_shipping_returns_html is not None:
        tenant.rug_shipping_returns_html = body.rug_shipping_returns_html or None
    if body.about_us_content_html is not None:
        tenant.about_us_content_html = body.about_us_content_html or None
    if body.about_page is not None:
        # The admin "About Page" editor always submits the whole structure, so a
        # straight replace is correct — no field-by-field merge needed.
        tenant.about_page = body.about_page.model_dump()
    if body.certifications is not None:
        tenant.certifications = body.certifications
    if body.default_shipping_rate is not None:
        tenant.default_shipping_rate = body.default_shipping_rate
    if body.cancellation_window_hours is not None:
        tenant.cancellation_window_hours = body.cancellation_window_hours
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")  # /customer/settings mirrors business_name/logo_url/contact fields from this same tenant row
    return TenantPublic.model_validate(tenant)


@router.post("/tenant/refresh-exchange-rates", response_model=TenantPublic)
def refresh_tenant_exchange_rates(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Manually triggers an immediate live FX rate refresh (the same refresh the
    background job runs daily) — lets the vendor pull fresh rates on demand
    instead of waiting for the next automatic cycle."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    rates = fetch_live_rates(tenant.base_currency or "INR")
    if rates is None:
        raise HTTPException(status_code=503, detail="Could not reach the exchange rate service. Please try again shortly.")
    tenant.exchange_rates = rates
    tenant.exchange_rates_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")
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


ALLOWED_CATALOG_PDF_TYPES = {"application/pdf"}
MAX_CATALOG_PDF_SIZE_MB = 25


@router.post("/tenant/catalog-pdf", response_model=TenantPublic)
async def upload_catalog_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CATALOG_PDF_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use PDF.")

    contents = await file.read()
    if len(contents) > MAX_CATALOG_PDF_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_CATALOG_PDF_SIZE_MB}MB allowed.")

    filename = f"{uuid.uuid4().hex}.pdf"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.catalog_pdf_url = f"/static/branding/{filename}"
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")
    return TenantPublic.model_validate(tenant)


ALLOWED_HERO_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_HERO_IMAGE_SIZE_MB = 10


@router.post("/tenant/hero-image", response_model=TenantPublic)
async def upload_hero_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Storefront homepage hero background image, shown behind the 'Handcrafted Rugs.
    Made for Timeless Spaces.' headline. Falls back to a curated default when unset."""
    if file.content_type not in ALLOWED_HERO_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_HERO_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_HERO_IMAGE_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    uploaded_url = f"/static/branding/{filename}"
    images = list(tenant.hero_images or [])
    images.append({
        "image_url": uploaded_url,
        "alt_text": "",
        "eyebrow": "",
        "headline": "",
        "button_text": "",
    })
    tenant.hero_images = images
    if not tenant.hero_image_url:
        tenant.hero_image_url = uploaded_url
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")
    return TenantPublic.model_validate(tenant)


@router.post("/tenant/homepage-full-bleed-image", response_model=TenantPublic)
async def upload_homepage_full_bleed_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Upload the single wide image displayed below the homepage introduction."""
    if file.content_type not in ALLOWED_HERO_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_HERO_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_HERO_IMAGE_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.homepage_full_bleed_image_url = f"/static/branding/{filename}"
    tenant.homepage_full_bleed_enabled = True
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")
    return TenantPublic.model_validate(tenant)


@router.post("/tenant/homepage-contact-image", response_model=TenantPublic)
async def upload_homepage_contact_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Upload the image displayed beside the homepage enquiry form."""
    if file.content_type not in ALLOWED_HERO_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_HERO_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_HERO_IMAGE_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.homepage_contact_image_url = f"/static/branding/{filename}"
    tenant.homepage_contact_enabled = True
    db.commit()
    db.refresh(tenant)
    cache_clear("tenant")
    cache_clear("settings")
    return TenantPublic.model_validate(tenant)


@router.post("/tenant/certification-image")
async def upload_certification_image(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_FAVICON_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use PNG, JPEG, or SVG.")

    contents = await file.read()
    if len(contents) > MAX_FAVICON_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FAVICON_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/static/branding/{filename}"}


@router.post("/tenant/about-image")
async def upload_about_image(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    """Image for a section of the public About page (hero background, founder photo).
    Returns the URL only — the caller stores it inside the `about_page` structure
    and persists it with the next PATCH /tenant/settings."""
    if file.content_type not in ALLOWED_HERO_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_HERO_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_HERO_IMAGE_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(BRANDING_DIR, exist_ok=True)
    filepath = os.path.join(BRANDING_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/static/branding/{filename}"}
