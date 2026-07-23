from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)  # e.g. "acme-rugs"
    gstin = Column(String(20), nullable=True)
    state_code = Column(String(2), nullable=True)   # 2-digit GST state code e.g. "09" for UP
    address = Column(Text, nullable=True)
    lut_number = Column(String(50), nullable=True)  # Letter of Undertaking for export invoices
    currency = Column(String(10), default="INR")          # display / invoice currency
    base_currency = Column(String(10), default="INR")     # immutable reference currency for all stored values
    exchange_rates = Column(JSON, nullable=True)          # {"USD": 0.012, "EUR": 0.011} — all relative to base_currency
    logo_url = Column(String(300), nullable=True)
    plan = Column(String(50), default="starter")  # starter / growth / pro
    plan_status = Column(String(20), default="trial")  # trial / active / past_due / cancelled
    razorpay_customer_id = Column(String(100), nullable=True)
    razorpay_subscription_id = Column(String(100), nullable=True)
    ai_credits_used = Column(Integer, default=0)
    billing_cycle_start = Column(DateTime(timezone=True), nullable=True)
    default_profit_margin_pct = Column(Float, default=40.0)
    rush_surcharge_pct = Column(Float, default=25.0)
    default_gst_pct = Column(Float, default=12.0)
    large_format_threshold_sqm = Column(Float, default=20.0)
    large_format_surcharge_pct = Column(Float, default=5.0)
    ai_assistant_customer_enabled = Column(Boolean, default=True)  # show AI chat widget to shoppers
    ai_assistant_vendor_enabled = Column(Boolean, default=True)    # show AI Assistant page to staff/admin
    vendor_notification_email = Column(String(200), nullable=True)  # where quote-request/review-request emails go; falls back to SMTP_FROM_EMAIL
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    staff_users = relationship("StaffUser", back_populates="tenant")


class StaffUser(Base):
    __tablename__ = "staff_users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    email = Column(String(200), nullable=False)
    hashed_password = Column(String(300), nullable=False)
    full_name = Column(String(150), nullable=True)
    role = Column(String(20), default="staff")  # admin / staff
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("email", "tenant_id", name="uq_staff_email_tenant"),)

    tenant = relationship("Tenant", back_populates="staff_users")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # wool/silk/cotton/synthetic
    color = Column(String(100), nullable=False)
    stock_meters = Column(Float, default=0.0)
    cost_per_sqm = Column(Float, nullable=False)
    cost_currency = Column(String(10), nullable=True)     # currency cost_per_sqm was entered in
    is_available = Column(Boolean, default=True)

    rugs = relationship("RugCatalog", back_populates="material")
    quotes = relationship("Quote", back_populates="material")
    inventory_transactions = relationship("InventoryTransaction", back_populates="material")


class RugCatalog(Base):
    __tablename__ = "rug_catalog"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    sizes = Column(JSON, nullable=False)
    base_price = Column(Float, nullable=False)
    base_price_currency = Column(String(10), nullable=True)     # currency base_price was entered in
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    pile_height = Column(String(50), nullable=True)
    weave_type = Column(String(100), nullable=True)
    lead_time_days = Column(Integer, default=21)
    image_url = Column(String(300), nullable=True)
    profit_margin_pct = Column(Float, nullable=True)
    hsn_code = Column(String(10), nullable=True, default="5703")  # HSN 5701-5705 for rugs

    material = relationship("Material", back_populates="rugs")
    quotes = relationship("Quote", back_populates="rug_catalog")


class PricingRule(Base):
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(150), nullable=False)
    rule_type = Column(String(50), nullable=False)
    min_qty = Column(Float, nullable=True)
    max_qty = Column(Float, nullable=True)
    multiplier = Column(Float, nullable=True)
    flat_fee = Column(Float, nullable=True)
    description = Column(Text, nullable=True)


class MOQRule(Base):
    __tablename__ = "moq_rules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    rug_type = Column(String(100), nullable=False)
    minimum_sqm = Column(Float, nullable=True)
    minimum_pieces = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)


class ProductionTimeline(Base):
    __tablename__ = "production_timelines"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    order_type = Column(String(100), nullable=False)
    base_days = Column(Integer, nullable=False)
    complexity_multiplier_per_sqm = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(150), nullable=False)
    email = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=True)
    company = Column(String(150), nullable=True)
    gstin = Column(String(20), nullable=True)
    state_code = Column(String(2), nullable=True)
    address = Column(Text, nullable=True)
    is_export_buyer = Column(Boolean, default=False)  # foreign buyer → export invoice
    hashed_password = Column(String(300), nullable=True)  # null = unregistered (portal-only after registration)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # email verified — required to log in once hashed_password is set
    verification_token = Column(String(100), nullable=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("email", "tenant_id", name="uq_customer_email_tenant"),)

    quotes = relationship("Quote", back_populates="customer")


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    rug_catalog_id = Column(Integer, ForeignKey("rug_catalog.id"), nullable=True)
    custom_size_w = Column(Float, nullable=True)
    custom_size_h = Column(Float, nullable=True)
    rug_shape = Column(String(20), default="rect")  # rect | circle | oval
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    qty = Column(Integer, default=1)
    base_price = Column(Float, nullable=True)
    final_price = Column(Float, nullable=True)
    rush_order = Column(Boolean, default=False)
    price_currency = Column(String(10), nullable=True)    # currency final_price / base_price were calculated in
    margin_pct = Column(Float, nullable=True)             # effective margin % used when this quote was calculated
    gst_pct = Column(Float, nullable=True)                # GST % applied when this quote was calculated
    manual_discount_pct = Column(Float, nullable=True)    # vendor-set per-quote discount percentage
    expected_delivery_days = Column(Integer, nullable=True)  # vendor-editable override of the engine's estimated_days
    status = Column(String(50), default="draft")
    notes = Column(Text, nullable=True)
    vendor_notes = Column(Text, nullable=True)            # message from vendor when sending/adjusting
    customer_response_notes = Column(Text, nullable=True) # customer reason when accepting/rejecting
    review_request_count = Column(Integer, default=0)     # how many times customer has requested re-review
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="quotes")
    rug_catalog = relationship("RugCatalog", back_populates="quotes")
    material = relationship("Material", back_populates="quotes")
    order = relationship("Order", back_populates="quote", uselist=False)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    status = Column(String(50), default="pending")
    shipping_address = Column(Text, nullable=True)
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    actual_delivery = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quote = relationship("Quote", back_populates="order")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    qty_change = Column(Float, nullable=False)
    transaction_type = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    material = relationship("Material", back_populates="inventory_transactions")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    key = Column(String(50), nullable=False)     # e.g. "quote_sent" — fixed, code-defined set
    name = Column(String(150), nullable=False)   # human label shown in Settings UI
    subject = Column(String(300), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("tenant_id", "key", name="uq_email_template_tenant_key"),)
