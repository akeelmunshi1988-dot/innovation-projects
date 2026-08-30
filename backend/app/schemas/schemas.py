from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
import re

from app.core.auth import validate_password_strength


# ── Material ──────────────────────────────────────────────────────────────────

class MaterialBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., min_length=1)
    color: str = Field(..., min_length=1)
    stock_meters: float = Field(0.0, ge=0)
    cost_per_sqm: float = Field(..., ge=0)
    cost_currency: Optional[str] = None
    is_available: bool = True
    inventory_quantity: Optional[int] = Field(None, ge=0)


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
    inventory_quantity: Optional[int] = Field(None, ge=0)


class Material(MaterialBase):
    id: int

    class Config:
        from_attributes = True


# ── RugCatalog ────────────────────────────────────────────────────────────────

class RugSize(BaseModel):
    """A vendor-entered standard size. `cm` is a plain optional field the vendor
    types themselves on the catalog form — never computed from `ft`. A size with
    no `cm` just isn't offered in cm mode on the customer-facing site."""
    ft: str
    cm: Optional[str] = None
    is_default: bool = False
    price: float = Field(..., ge=0, description="Vendor-entered total selling price for one rug in this size")


class RugCatalogBase(BaseModel):
    name: str
    description: Optional[str] = None
    about_content_html: Optional[str] = None
    sizes: List[RugSize]
    base_price: float = Field(..., ge=0)
    base_price_currency: Optional[str] = None
    material_id: int
    pile_height: Optional[str] = None
    weave_type: Optional[str] = None
    lead_time_days: int = 21
    image_url: Optional[str] = None
    profit_margin_pct: Optional[float] = None
    hsn_code: Optional[str] = "5703"
    room_types: Optional[List[str]] = None
    mood_tags: Optional[List[str]] = None
    is_available: bool = True


class RugCatalogCreate(RugCatalogBase):
    pass


class RugCatalogUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    about_content_html: Optional[str] = None
    sizes: Optional[List[RugSize]] = None
    base_price: Optional[float] = None
    base_price_currency: Optional[str] = None
    material_id: Optional[int] = None
    pile_height: Optional[str] = None
    weave_type: Optional[str] = None
    lead_time_days: Optional[int] = None
    image_url: Optional[str] = None
    profit_margin_pct: Optional[float] = None
    hsn_code: Optional[str] = None
    room_types: Optional[List[str]] = None
    mood_tags: Optional[List[str]] = None
    is_available: Optional[bool] = None


class RugImage(BaseModel):
    id: int
    image_url: str
    sort_order: int = 0

    class Config:
        from_attributes = True


class RugImageCreate(BaseModel):
    image_url: str
    sort_order: int = 0


class RugImageUpdate(BaseModel):
    sort_order: int


class RugCatalog(RugCatalogBase):
    id: int
    slug: Optional[str] = None
    material: Optional[Material] = None
    images: List[RugImage] = []

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
    country: Optional[str] = "India"
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
    country: Optional[str] = None
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
    rug_shape: Optional[str] = None
    material_id: Optional[int] = None
    qty: int = 1
    base_price: Optional[float] = None
    final_price: Optional[float] = None
    rush_order: bool = False
    margin_pct: Optional[float] = None
    gst_pct: Optional[float] = None
    manual_discount_pct: Optional[float] = None
    shipping_cost: Optional[float] = None
    expected_delivery_days: Optional[int] = None
    status: str = "draft"
    notes: Optional[str] = None
    vendor_notes: Optional[str] = None
    customer_response_notes: Optional[str] = None
    is_custom_request: bool = False
    room_type: Optional[str] = None
    material_preference: Optional[str] = None
    budget_range: Optional[str] = None
    expected_delivery: Optional[str] = None
    reference_image_urls: Optional[List[str]] = None
    vendor_sample_image_urls: Optional[List[str]] = None
    revised_from_quote_id: Optional[int] = None
    request_group_id: Optional[str] = None


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
    expected_delivery_days: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    vendor_notes: Optional[str] = None
    customer_response_notes: Optional[str] = None


class QuoteSendRequest(BaseModel):
    vendor_notes: Optional[str] = None


class QuoteRejectRequest(BaseModel):
    reason: Optional[str] = None


class QuoteAdjustRequest(BaseModel):
    # Either final_price (manual) or material_id (calculated from margin over
    # material cost — used for custom rug requests with no catalog rug) must be
    # provided; enforced in the route, not here, since it's a cross-field rule.
    final_price: Optional[float] = None
    material_id: Optional[int] = None
    margin_pct: Optional[float] = Field(None, ge=0, le=500)
    vendor_notes: Optional[str] = None
    manual_discount_pct: Optional[float] = None
    shipping_cost: Optional[float] = None
    # Lets the vendor fill in (or correct) a custom request's dimensions while
    # pricing it — many custom requests arrive with no size on file yet, which
    # otherwise blocks the material-cost calculation entirely.
    custom_size_w: Optional[float] = None
    custom_size_h: Optional[float] = None
    rug_shape: Optional[str] = None


class QuoteCustomerRespondRequest(BaseModel):
    customer_response_notes: Optional[str] = None
    promo_code: Optional[str] = None


class QuoteSampleImagesRequest(BaseModel):
    image_urls: List[str] = Field(..., max_length=3)


class Quote(QuoteBase):
    id: int
    price_currency: Optional[str] = None
    created_at: datetime
    customer: Optional[Customer] = None
    rug_catalog: Optional[RugCatalog] = None
    material: Optional[Material] = None

    class Config:
        from_attributes = True


class QuotePaginatedResponse(BaseModel):
    items: List[Quote]
    total: int
    page: int
    page_size: int
    pages: int
    status_counts: dict  # {"all": n, "draft": n, "sent": n, "accepted": n, "rejected": n} — same filters minus status


class QuoteCalculateRequest(BaseModel):
    rug_id: int
    size_w: float = Field(..., gt=0, le=50, description="Width in metres (0–50m)")
    size_h: float = Field(..., gt=0, le=50, description="Height in metres (0–50m)")
    material_id: int
    qty: int = Field(1, ge=1, le=10000)
    rush_order: bool = False
    manual_discount_pct: Optional[float] = Field(None, ge=0, le=100)


class QuoteCalculateResponse(BaseModel):
    size_sqm: float
    total_sqm: float
    catalog_price_per_piece: float = 0.0
    base_price_per_sqm: float
    material_cost_per_sqm: float
    profit_margin_pct: float = 0.0
    subtotal: float
    bulk_discount: float
    manual_discount: float = 0.0
    rush_surcharge: float
    size_surcharge: float
    shipping_cost: float = 0.0
    pre_gst_price: float = 0.0
    gst_pct: float = 12.0
    gst_amount: float = 0.0
    gst_inclusive: bool = False
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
    shipping_cost: Optional[float] = None


class OrderCombineRequest(BaseModel):
    order_ids: List[int] = Field(..., min_length=2, max_length=20)


class OrderItemSchema(BaseModel):
    id: int
    quote: Optional[Quote] = None

    class Config:
        from_attributes = True


class Order(OrderBase):
    id: int
    created_at: datetime
    promo_code: Optional[str] = None
    discount_amount: Optional[float] = None
    shipping_cost: Optional[float] = None
    razorpay_payment_id: Optional[str] = None
    refund_id: Optional[str] = None
    refund_status: Optional[str] = None
    refund_amount: Optional[float] = None
    refunded_at: Optional[datetime] = None
    quote: Optional[Quote] = None
    items: List[OrderItemSchema] = []

    class Config:
        from_attributes = True


# ── PromoCode ────────────────────────────────────────────────────────────────

class PromoCodeBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    discount_type: str  # 'percentage' | 'flat' | 'free_shipping'
    discount_value: Optional[float] = None
    min_order_value: Optional[float] = None
    max_uses: Optional[int] = None
    one_per_customer: bool = False
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

    @field_validator("discount_type")
    @classmethod
    def valid_discount_type(cls, v):
        if v not in ("percentage", "flat", "free_shipping"):
            raise ValueError("discount_type must be 'percentage', 'flat', or 'free_shipping'")
        return v


class PromoCodeCreate(PromoCodeBase):
    pass


class PromoCodeUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_value: Optional[float] = None
    max_uses: Optional[int] = None
    one_per_customer: Optional[bool] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class PromoCode(PromoCodeBase):
    id: int
    used_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class PromoValidateRequest(BaseModel):
    code: str
    subtotal: float = Field(..., ge=0)
    email: Optional[EmailStr] = None


class PromoValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: str
    discount_value: Optional[float] = None
    discount_amount: float
    message: str


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
    exchange_rates_auto: bool = True
    exchange_rates_updated_at: Optional[datetime] = None
    logo_url: Optional[str] = None
    plan: str
    plan_status: str = "trial"
    ai_credits_used: int = 0
    default_profit_margin_pct: float = 40.0
    rush_surcharge_pct: float = 25.0
    large_format_threshold_sqm: float = 20.0
    large_format_surcharge_pct: float = 5.0
    gst_inclusive: bool = False
    ai_assistant_customer_enabled: bool = True
    ai_assistant_vendor_enabled: bool = True
    vendor_notification_email: Optional[str] = None
    default_size_unit: str = "ft"
    contact_emails: List[str] = []
    contact_phones: List[str] = []
    contact_address: Optional[str] = None
    contact_hours: Optional[str] = None
    catalog_pdf_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_eyebrow: Optional[str] = None
    hero_heading: Optional[str] = None
    hero_cta_label: Optional[str] = None
    certifications: List[dict] = []
    default_shipping_rate: Optional[float] = None
    cancellation_window_hours: int = 24

    @field_validator('certifications', mode='before')
    @classmethod
    def _none_to_empty_certifications(cls, v):
        return v or []

    @field_validator('contact_emails', 'contact_phones', mode='before')
    @classmethod
    def _none_to_empty_list(cls, v):
        return v if v is not None else []

    class Config:
        from_attributes = True


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    exchange_rates: Optional[dict] = None
    exchange_rates_auto: Optional[bool] = None
    gstin: Optional[str] = Field(None, max_length=15)
    state_code: Optional[str] = None
    address: Optional[str] = None
    lut_number: Optional[str] = None
    default_profit_margin_pct: Optional[float] = Field(None, ge=0, le=500)
    rush_surcharge_pct: Optional[float] = Field(None, ge=0, le=200)
    large_format_threshold_sqm: Optional[float] = Field(None, ge=1, le=500)
    large_format_surcharge_pct: Optional[float] = Field(None, ge=0, le=100)
    gst_inclusive: Optional[bool] = None
    ai_assistant_customer_enabled: Optional[bool] = None
    ai_assistant_vendor_enabled: Optional[bool] = None
    vendor_notification_email: Optional[EmailStr] = None
    default_size_unit: Optional[str] = None
    contact_emails: Optional[List[str]] = None
    contact_phones: Optional[List[str]] = None
    contact_address: Optional[str] = None
    contact_hours: Optional[str] = Field(None, max_length=200)
    catalog_pdf_url: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_eyebrow: Optional[str] = Field(None, max_length=100)
    hero_heading: Optional[str] = Field(None, max_length=200)
    hero_cta_label: Optional[str] = Field(None, max_length=50)
    certifications: Optional[List[dict]] = None
    default_shipping_rate: Optional[float] = Field(None, ge=0)
    cancellation_window_hours: Optional[int] = Field(None, ge=0, le=8760)

    @field_validator('contact_emails')
    @classmethod
    def validate_contact_emails(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        cleaned = [e.strip() for e in v if e.strip()]
        email_re = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
        for e in cleaned:
            if not email_re.match(e):
                raise ValueError(f'Invalid email address: {e}')
        return cleaned

    @field_validator('contact_phones')
    @classmethod
    def validate_contact_phones(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        return [p.strip() for p in v if p.strip()]

    @field_validator('default_size_unit')
    @classmethod
    def validate_default_size_unit(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ('ft', 'cm', 'both'):
            raise ValueError("default_size_unit must be 'ft', 'cm', or 'both'")
        return v

    @field_validator('gstin')
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            v = v.strip().upper()
            if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$', v):
                raise ValueError('Invalid GSTIN format (expected 15-char format e.g. 27AABCU9603R1ZX)')
        return v or None

    @field_validator('exchange_rates')
    @classmethod
    def validate_exchange_rates(cls, v: Optional[dict]) -> Optional[dict]:
        if v:
            for currency, rate in v.items():
                if not isinstance(rate, (int, float)) or rate <= 0:
                    raise ValueError(f'Exchange rate for {currency} must be a positive number')
        return v


# ── Auth (Staff) ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=2, max_length=50, pattern=r'^[a-z0-9-]+$')
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    currency: str = Field("USD", min_length=3, max_length=3)
    gstin: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _strong_password(cls, v):
        return validate_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: Optional[str]
    email: str
    role: str
    tenant: TenantPublic


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    user_id: int
    full_name: Optional[str]
    email: str
    role: str
    tenant: TenantPublic


# ── Auth (Customer) ───────────────────────────────────────────────────────────

class CustomerRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    country: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=200)
    account_type: Optional[str] = Field("retail", max_length=20)  # "retail" | "trade"

    @field_validator("password")
    @classmethod
    def _strong_password(cls, v):
        return validate_password_strength(v)


class CustomerLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class CustomerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer_id: int
    name: str
    email: str
    country: Optional[str] = None


class CustomerRegisterResponse(BaseModel):
    message: str
    email: str


class CustomerVerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strong_password(cls, v):
        return validate_password_strength(v)


# ── Email Templates ────────────────────────────────────────────────────────────

class EmailTemplate(BaseModel):
    id: int
    key: str
    name: str
    subject: str
    body_html: str
    body_text: str
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    is_active: Optional[bool] = None


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = None


class PendingAiAction(BaseModel):
    id: int
    action_type: str
    entity_type: str
    entity_id: Optional[int] = None
    payload: dict
    summary: str
    status: str
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    response: str
    session_id: str
    pending_actions: List[PendingAiAction] = []


class AiChatMessage(BaseModel):
    id: int
    session_id: Optional[str] = None
    role: str
    content: str
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True


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


# ── Showcase Videos ────────────────────────────────────────────────────────────

class ShowcaseVideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    poster_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    is_intro: bool = False


class ShowcaseVideoCreate(ShowcaseVideoBase):
    pass


class ShowcaseVideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    poster_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_intro: Optional[bool] = None


class ShowcaseVideo(ShowcaseVideoBase):
    id: int

    class Config:
        from_attributes = True


# ── Workshop Photos ────────────────────────────────────────────────────────────

class WorkshopPhotoBase(BaseModel):
    caption: str
    description: Optional[str] = None
    image_url: str
    sort_order: int = 0
    is_active: bool = True


class WorkshopPhotoCreate(WorkshopPhotoBase):
    pass


class WorkshopPhotoUpdate(BaseModel):
    caption: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class WorkshopPhoto(WorkshopPhotoBase):
    id: int

    class Config:
        from_attributes = True


# ── Testimonials ───────────────────────────────────────────────────────────────

class AnnouncementMessageBase(BaseModel):
    text: str
    link_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class AnnouncementMessageCreate(AnnouncementMessageBase):
    pass


class AnnouncementMessageUpdate(BaseModel):
    text: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class AnnouncementMessage(AnnouncementMessageBase):
    id: int

    class Config:
        from_attributes = True


class TestimonialBase(BaseModel):
    author_name: str
    author_title: Optional[str] = None
    country: Optional[str] = None
    quote: str
    photo_url: Optional[str] = None
    rating: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    author_name: Optional[str] = None
    author_title: Optional[str] = None
    country: Optional[str] = None
    quote: Optional[str] = None
    photo_url: Optional[str] = None
    rating: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class Testimonial(TestimonialBase):
    id: int

    class Config:
        from_attributes = True


# ── Project Gallery ────────────────────────────────────────────────────────────

class ProjectGalleryItemBase(BaseModel):
    image_url: str
    caption: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class ProjectGalleryItemCreate(ProjectGalleryItemBase):
    pass


class ProjectGalleryItemUpdate(BaseModel):
    image_url: Optional[str] = None
    caption: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class ProjectGalleryItem(ProjectGalleryItemBase):
    id: int

    class Config:
        from_attributes = True


# ── Newsletter ─────────────────────────────────────────────────────────────────

class NewsletterSubscriberCreate(BaseModel):
    email: str
    source: Optional[str] = None


class NewsletterSubscriber(BaseModel):
    id: int
    email: str
    source: Optional[str] = None
    subscribed_at: Optional[Any] = None

    class Config:
        from_attributes = True


# ── Public API clients ──────────────────────────────────────────────────────────

class ApiClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)


class ApiClient(BaseModel):
    id: int
    name: str
    key_prefix: str
    is_active: bool
    created_at: Optional[Any] = None
    last_used_at: Optional[Any] = None

    class Config:
        from_attributes = True


class ApiClientCreated(ApiClient):
    """Returned only once, at creation time — the raw key is never retrievable again."""
    api_key: str


# ── Public API request bodies (app/api/routes/public_api.py) ───────────────────

class PublicCatalogCreate(RugCatalogCreate):
    pass


class PublicMaterialCreate(MaterialCreate):
    pass


class PublicRugImageCreate(RugImageCreate):
    pass


class PublicRugImageUpdate(RugImageUpdate):
    pass


class PublicRestockRequest(BaseModel):
    qty_meters: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class PublicQuoteItem(BaseModel):
    rug_id: int
    size_w: float = Field(..., gt=0, le=50)
    size_h: float = Field(..., gt=0, le=50)
    qty: int = Field(1, ge=1, le=10000)
    rush_order: bool = False
    shape: str = "rect"


class PublicQuoteCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_email: EmailStr
    customer_phone: Optional[str] = Field(None, max_length=20)
    item: PublicQuoteItem


class PublicOrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_email: EmailStr
    customer_phone: Optional[str] = Field(None, max_length=20)
    shipping_address: str = Field(..., min_length=5, max_length=1000)
    country: str = Field("India", max_length=100)
    items: List[PublicQuoteItem] = Field(..., min_length=1)
    external_reference: Optional[str] = Field(None, max_length=100, description="The partner system's own id for this sale, for reconciliation.")
