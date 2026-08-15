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
    exchange_rates_auto = Column(Boolean, default=True)   # True: refreshed automatically from live FX rates; False: vendor manages rates manually
    exchange_rates_updated_at = Column(DateTime(timezone=True), nullable=True)  # when exchange_rates was last refreshed (auto or manual)
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
    gst_inclusive = Column(Boolean, default=False)  # True: GST applied, included in selling price; False: no GST calculated at all
    large_format_threshold_sqm = Column(Float, default=20.0)
    large_format_surcharge_pct = Column(Float, default=5.0)
    ai_assistant_customer_enabled = Column(Boolean, default=True)  # show AI chat widget to shoppers
    ai_assistant_vendor_enabled = Column(Boolean, default=True)    # show AI Assistant page to staff/admin
    vendor_notification_email = Column(String(200), nullable=True)  # where quote-request/review-request emails go; falls back to SMTP_FROM_EMAIL
    default_size_unit = Column(String(10), default="ft")  # "ft" or "cm" — display unit for standard rug sizes
    contact_emails = Column(JSON, nullable=True)          # list[str] — shown on the public "About Us" / Contact page
    contact_phones = Column(JSON, nullable=True)          # list[str]
    contact_address = Column(Text, nullable=True)         # workshop/visiting address — distinct from the GST registered address
    contact_hours = Column(String(200), nullable=True)    # e.g. "Mon-Sat, 9am-6pm"
    catalog_pdf_url = Column(String(300), nullable=True)   # downloadable lookbook/catalog shown on storefront
    hero_image_url = Column(String(500), nullable=True)    # storefront homepage hero background image; falls back to a curated default when unset
    certifications = Column(JSON, nullable=True)           # list[{"label": str, "image_url": str}] — footer badges
    default_shipping_rate = Column(Float, nullable=True)   # flat shipping charge shown to + charged customers at checkout; null/0 = free
    cancellation_window_hours = Column(Integer, default=24)  # how long after placing an order a customer's order stays cancellable
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
    reset_token = Column(String(100), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
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
    __table_args__ = (UniqueConstraint("slug", "tenant_id", name="uq_rug_slug_tenant"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(220), nullable=True, index=True)  # URL-friendly identifier for /catalog/<slug> — unique per tenant, see uq_rug_slug_tenant
    description = Column(Text, nullable=True)
    about_content_html = Column(Text, nullable=True)  # admin-authored rich text for the catalog detail "About this rug" section — falls back to `description` (plain text) when empty
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
    images = relationship("RugImage", back_populates="rug_catalog", order_by="RugImage.sort_order", cascade="all, delete-orphan")


class RugImage(Base):
    __tablename__ = "rug_images"

    id = Column(Integer, primary_key=True, index=True)
    rug_catalog_id = Column(Integer, ForeignKey("rug_catalog.id"), nullable=False)
    image_url = Column(String(300), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    rug_catalog = relationship("RugCatalog", back_populates="images")


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
    country = Column(String(100), nullable=True, default="India")  # shipping country from checkout — drives is_export_buyer
    is_export_buyer = Column(Boolean, default=False)  # foreign buyer → export invoice
    account_type = Column(String(20), default="retail")  # "retail" | "trade" (architects/hotels/retailers)
    hashed_password = Column(String(300), nullable=True)  # null = unregistered (portal-only after registration)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # email verified — required to log in once hashed_password is set
    verification_token = Column(String(100), nullable=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    oauth_provider = Column(String(20), nullable=True)  # 'google' | 'facebook' | 'linkedin' — null for password/guest accounts
    oauth_id = Column(String(200), nullable=True)        # provider's unique user id
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
    shipping_cost = Column(Float, nullable=True)          # vendor-set flat shipping charge added to a custom request's quoted price
    expected_delivery_days = Column(Integer, nullable=True)  # vendor-editable override of the engine's estimated_days
    status = Column(String(50), default="draft")
    notes = Column(Text, nullable=True)
    vendor_notes = Column(Text, nullable=True)            # message from vendor when sending/adjusting
    customer_response_notes = Column(Text, nullable=True) # customer reason when accepting/rejecting
    review_request_count = Column(Integer, default=0)     # how many times customer has requested re-review
    is_custom_request = Column(Boolean, default=False)    # customer-submitted bespoke design brief, no catalog rug attached
    room_type = Column(String(100), nullable=True)        # custom request: intended room/purpose
    material_preference = Column(String(50), nullable=True)  # custom request: "wool"|"silk"|"cotton"|"synthetic"|"no_preference"
    budget_range = Column(String(100), nullable=True)     # custom request: preset band, e.g. "₹50,000–₹1,00,000"
    expected_delivery = Column(String(50), nullable=True)  # custom request: customer's preferred timeframe, e.g. "Within 4 weeks"
    request_group_id = Column(String(36), nullable=True, index=True)  # ties together multiple Quotes submitted as one multi-rug custom request, so the vendor can later combine their resulting orders
    reference_image_urls = Column(JSON, nullable=True)    # custom request: list[str], up to 3 inspiration images
    vendor_sample_image_urls = Column(JSON, nullable=True)  # vendor-uploaded design samples sent back to the customer, list[str], up to 3
    revised_from_quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)  # set when this quote was cloned from a rejected one via "Revise & Resend"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="quotes")
    rug_catalog = relationship("RugCatalog", back_populates="quotes")
    material = relationship("Material", back_populates="quotes")
    order = relationship("Order", back_populates="quote", uselist=False)
    revised_from = relationship("Quote", remote_side=[id], back_populates="revisions")
    revisions = relationship("Quote", back_populates="revised_from")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)  # first item's quote — back-compat pointer for single-item views
    status = Column(String(50), default="pending")
    shipping_address = Column(Text, nullable=True)
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    actual_delivery = Column(DateTime(timezone=True), nullable=True)
    promo_code = Column(String(50), nullable=True)
    discount_amount = Column(Float, nullable=True)  # total discount applied across all items, in the order's price_currency
    shipping_cost = Column(Float, nullable=True)  # snapshot of the shipping charge at checkout time; admin-editable afterward (e.g. on marking Shipped)
    total_amount = Column(Float, nullable=True)   # sum of every line item's final_price + shipping - discount, frozen at order-creation time — the source of truth for what was agreed/paid, independent of the linked quote(s) ever changing later
    price_currency = Column(String(10), nullable=True)  # currency total_amount is denominated in
    razorpay_payment_id = Column(String(100), nullable=True)  # captured at checkout — needed to issue a refund; null for COD/manual orders
    refund_id = Column(String(100), nullable=True)        # Razorpay refund id, once a refund has been initiated
    refund_status = Column(String(20), nullable=True)     # Razorpay's refund status (e.g. "processed", "pending", "failed")
    refund_amount = Column(Float, nullable=True)          # amount actually refunded, in the order's price_currency
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quote = relationship("Quote", back_populates="order")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="items")
    quote = relationship("Quote")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    status = Column(String(50), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    code = Column(String(50), nullable=False)  # stored uppercase; uniqueness enforced per-tenant in the route
    discount_type = Column(String(20), nullable=False)  # 'percentage' | 'flat' | 'free_shipping'
    discount_value = Column(Float, nullable=True)  # % (0-100) for percentage, currency amount for flat; unused for free_shipping
    min_order_value = Column(Float, nullable=True)
    max_uses = Column(Integer, nullable=True)  # total redemptions allowed across all customers; null = unlimited
    one_per_customer = Column(Boolean, default=False)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    redemptions = relationship("PromoRedemption", back_populates="promo_code", cascade="all, delete-orphan")


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    discount_amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    promo_code = relationship("PromoCode", back_populates="redemptions")


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


class ShowcaseVideo(Base):
    __tablename__ = "showcase_videos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    video_url = Column(String(300), nullable=False)
    poster_url = Column(String(300), nullable=True)  # fallback/first-frame image shown before video loads
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_intro = Column(Boolean, default=False)  # shown in the rotating hero slot instead of the "Behind the Craft" grid
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkshopPhoto(Base):
    __tablename__ = "workshop_photos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    caption = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(300), nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    author_name = Column(String(150), nullable=False)
    author_title = Column(String(150), nullable=True)  # e.g. "Interior Architect"
    country = Column(String(100), nullable=True)
    quote = Column(Text, nullable=False)
    photo_url = Column(String(300), nullable=True)
    rating = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProjectGalleryItem(Base):
    __tablename__ = "project_gallery_items"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    image_url = Column(String(300), nullable=False)
    caption = Column(String(150), nullable=True)
    link_url = Column(String(300), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    email = Column(String(200), nullable=False)
    source = Column(String(50), nullable=True)  # e.g. "homepage_footer"
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("email", "tenant_id", name="uq_newsletter_email_tenant"),)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(String(10), nullable=False)  # "staff" | "customer"
    user_id = Column(Integer, nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)  # SHA-256 hex digest — raw token is never stored
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    replaced_by_id = Column(Integer, ForeignKey("refresh_tokens.id"), nullable=True)  # rotation chain
    created_at = Column(DateTime(timezone=True), server_default=func.now())
