from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.models.models import Tenant, StaffUser, Customer
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, MeResponse, TenantPublic, TenantUpdateRequest,
    CustomerRegisterRequest, CustomerLoginRequest, CustomerTokenResponse,
)

router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
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
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        tenant=TenantPublic.model_validate(tenant),
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(StaffUser).filter(StaffUser.email == body.email, StaffUser.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id)})
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
    return MeResponse(
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        tenant=TenantPublic.model_validate(current_user.tenant),
    )


@router.post("/auth/customer/register", response_model=CustomerTokenResponse, status_code=201)
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

    token = create_access_token({"sub": str(customer.id), "type": "customer"})
    return CustomerTokenResponse(access_token=token, customer_id=customer.id, name=customer.name, email=customer.email)


@router.post("/auth/customer/login", response_model=CustomerTokenResponse)
def customer_login(body: CustomerLoginRequest, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.email == body.email, Customer.is_active == True).first()
    if not customer or not customer.hashed_password or not verify_password(body.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(customer.id), "type": "customer"})
    return CustomerTokenResponse(access_token=token, customer_id=customer.id, name=customer.name, email=customer.email)


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
    db.commit()
    db.refresh(tenant)
    return TenantPublic.model_validate(tenant)
