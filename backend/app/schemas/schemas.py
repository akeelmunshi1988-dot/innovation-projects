from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ── Material ──────────────────────────────────────────────────────────────────

class MaterialBase(BaseModel):
    name: str
    type: str
    color: str
    stock_meters: float = 0.0
    cost_per_sqm: float
    cost_currency: Optional[str] = None
    is_available: bool = True


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    stock_meters: Optional[float] = None
    cost_per_sqm: Optional[float] = None
    cost_currency: Optional[str] = None
    is_available: Optional[bool] = None


class Material(MaterialBase):
    id: int

    class Config:
        from_attributes = True


# ── RugCatalog ────────────────────────────────────────────────────────────────

class RugCatalogBase(BaseModel):
    name: str
    description: Optional[str] = None
    sizes: List[str]
    base_price: float
    base_price_currency: Optional[str] = None
    material_id: int
    pile_height: Optional[str] = None
    weave_type: Optional[str] = None
    lead_time_days: int = 21
    image_url: Optional[str] = None
    profit_margin_pct: Optional[float] = None
    hsn_code: Optional[str] = "5703"


class RugCatalogCreate(RugCatalogBase):
    pass


class RugCatalogUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sizes: Optional[List[str]] = None
    base_price: Optional[float] = None
    base_price_currency: Optional[str] = None
    material_id: Optional[int] = None
    pile_height: Optional[str] = None
    weave_type: Optional[str] = None
    lead_time_days: Optional[int] = None
    image_url: Optional[str] = None
    profit_margin_pct: Optional[float] = None
    hsn_code: Optional[str] = None


class RugCatalog(RugCatalogBase):
    id: int
    material: Optional[Material] = None

    class Config:
        from_attributes = True


# ── PricingRule ───────────────────────────────────────────────────────────────

class PricingRuleBase(BaseModel):
    name: str
    rule_type: str
    min_qty: Optional[float] = None
    max_qty: Optional[float] = None
    multiplier: Optional[float] = None
    flat_fee: Optional[float] = None
    description: Optional[str] = None


class PricingRuleCreate(PricingRuleBase):
    pass


class PricingRule(PricingRuleBase):
    id: int

    class Config:
        from_attributes = True


# ── MOQRule ───────────────────────────────────────────────────────────────────

class MOQRuleBase(BaseModel):
    rug_type: str
    minimum_sqm: Optional[float] = None
    minimum_pieces: Optional[int] = None
    notes: Optional[str] = None


class MOQRuleCreate(MOQRuleBase):
    pass


class MOQRule(MOQRuleBase):
    id: int

    class Config:
        from_attributes = True


# ── ProductionTimeline ────────────────────────────────────────────────────────

class ProductionTimelineBase(BaseModel):
    order_type: str
    base_days: int
    complexity_multiplier_per_sqm: float = 0.0
    notes: Optional[str] = None


class ProductionTimelineCreate(ProductionTimelineBase):
    pass


class ProductionTimeline(ProductionTimelineBase):
    id: int

    class Config:
        from_attributes = True


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    gstin: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    is_export_buyer: bool = False


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    gstin: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    is_export_buyer: Optional[bool] = None


class Customer(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Quote ─────────────────────────────────────────────────────────────────────

class QuoteBase(BaseModel):
    customer_id: Optional[int] = None
    rug_catalog_id: Optional[int] = None
    custom_size_w: Optional[float] = None
    custom_size_h: Optional[float] = None
    material_id: Optional[int] = None
    qty: int = 1
    base_price: Optional[float] = None
    final_price: Optional[float] = None
    rush_order: bool = False
    margin_pct: Optional[float] = None
    gst_pct: Optional[float] = None
    manual_discount_pct: Optional[float] = None
    status: str = "draft"
    notes: Optional[str] = None
    vendor_notes: Optional[str] = None
    customer_response_notes: Optional[str] = None


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    customer_id: Optional[int] = None
    rug_catalog_id: Optional[int] = None
    custom_size_w: Optional[float] = None
    custom_size_h: Optional[float] = None
    material_id: Optional[int] = None
    qty: Optional[int] = None
    base_price: Optional[float] = None
    final_price: Optional[float] = None
    rush_order: Optional[bool] = None
    manual_discount_pct: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    vendor_notes: Optional[str] = None
    customer_response_notes: Optional[str] = None


class QuoteSendRequest(BaseModel):
    vendor_notes: Optional[str] = None


class QuoteAdjustRequest(BaseModel):
    final_price: float
    vendor_notes: Optional[str] = None
    manual_discount_pct: Optional[float] = None


class QuoteCustomerRespondRequest(BaseModel):
    customer_response_notes: Optional[str] = None


class Quote(QuoteBase):
    id: int
    price_currency: Optional[str] = None
    created_at: datetime
    customer: Optional[Customer] = None
    rug_catalog: Optional[RugCatalog] = None
    material: Optional[Material] = None

    class Config:
        from_attributes = True


class QuoteCalculateRequest(BaseModel):
    rug_id: int
    size_w: float
    size_h: float
    material_id: int
    qty: int = 1
    rush_order: bool = False
    manual_discount_pct: Optional[float] = None


class QuoteCalculateResponse(BaseModel):
    size_sqm: float
    total_sqm: float
    base_price_per_sqm: float
    material_cost_per_sqm: float
    profit_margin_pct: float = 0.0
    subtotal: float
    bulk_discount: float
    manual_discount: float = 0.0
    rush_surcharge: float
    size_surcharge: float
    pre_gst_price: float = 0.0
    gst_pct: float = 12.0
    gst_amount: float = 0.0
    final_price: float
    price_per_piece: float
    price_currency: str = "INR"
    moq_met: bool
    moq_message: str
    material_available: bool
    material_message: str
    estimated_days: int
    breakdown: List[dict]


# ── Order ─────────────────────────────────────────────────────────────────────

class OrderBase(BaseModel):
    quote_id: int
    status: str = "pending"
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None


class Order(OrderBase):
    id: int
    created_at: datetime
    quote: Optional[Quote] = None

    class Config:
        from_attributes = True


# ── InventoryTransaction ──────────────────────────────────────────────────────

class InventoryTransactionBase(BaseModel):
    material_id: int
    qty_change: float
    transaction_type: str
    notes: Optional[str] = None


class InventoryTransactionCreate(InventoryTransactionBase):
    pass


class InventoryTransaction(InventoryTransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Tenant ───────────────────────────────────────────────────────────────────

class TenantPublic(BaseModel):
    id: int
    name: str
    slug: str
    gstin: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    lut_number: Optional[str] = None
    currency: str
    base_currency: str = "INR"
    exchange_rates: dict = {}
    logo_url: Optional[str] = None
    plan: str
    plan_status: str = "trial"
    ai_credits_used: int = 0
    default_profit_margin_pct: float = 40.0
    rush_surcharge_pct: float = 25.0
    large_format_threshold_sqm: float = 20.0
    large_format_surcharge_pct: float = 5.0

    class Config:
        from_attributes = True


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    exchange_rates: Optional[dict] = None
    gstin: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    lut_number: Optional[str] = None
    default_profit_margin_pct: Optional[float] = None
    rush_surcharge_pct: Optional[float] = None
    large_format_threshold_sqm: Optional[float] = None
    large_format_surcharge_pct: Optional[float] = None


# ── Auth (Staff) ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    company_name: str
    slug: str
    full_name: str
    email: str
    password: str
    currency: str = "USD"
    gstin: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: Optional[str]
    email: str
    role: str
    tenant: TenantPublic


class MeResponse(BaseModel):
    user_id: int
    full_name: Optional[str]
    email: str
    role: str
    tenant: TenantPublic


# ── Auth (Customer) ───────────────────────────────────────────────────────────

class CustomerRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    company: Optional[str] = None


class CustomerLoginRequest(BaseModel):
    email: str
    password: str


class CustomerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer_id: int
    name: str
    email: str


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_orders: int
    total_revenue: float
    active_quotes: int
    low_stock_materials: int
    orders_in_production: int
    orders_pending: int
    recent_orders: List[Any]
    recent_quotes: List[Any]
    monthly_revenue: List[Any]
