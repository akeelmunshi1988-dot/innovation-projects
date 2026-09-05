from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON, UniqueConstraint, Index
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
    enabled_currencies = Column(JSON, nullable=True)      # currency codes exposed in the storefront selector
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
    hero_images = Column(JSON, nullable=True)              # ordered list[{image_url, alt_text}] used by the homepage carousel
    hero_eyebrow = Column(String(100), nullable=True)       # small line above the hero headline, e.g. "20+ Years in the Making"; falls back to a default when unset
    hero_heading = Column(String(200), nullable=True)       # main hero headline text; falls back to a default when unset
    hero_cta_label = Column(String(50), nullable=True)      # hero CTA link text (always links to /catalog); falls back to a default when unset
    homepage_full_bleed_image_url = Column(String(500), nullable=True)  # wide image directly below the homepage introduction
    homepage_full_bleed_alt_text = Column(String(200), nullable=True)
    homepage_full_bleed_enabled = Column(Boolean, default=True)
    homepage_values_eyebrow = Column(String(100), nullable=True)
    homepage_values_headline = Column(String(250), nullable=True)
    homepage_values_headline_accent = Column(String(250), nullable=True)
    homepage_values_description = Column(Text, nullable=True)
    homepage_values_items = Column(JSON, nullable=True)  # ordered list[{icon,title,description}]
    homepage_values_enabled = Column(Boolean, default=True)
    homepage_intro_title_line_one = Column(String(100), nullable=True)
    homepage_intro_title_line_two = Column(String(100), nullable=True)
    homepage_intro_label = Column(String(100), nullable=True)
    homepage_intro_description = Column(Text, nullable=True)
    homepage_intro_cta_label = Column(String(60), nullable=True)
    homepage_intro_cta_url = Column(String(300), nullable=True)
    homepage_intro_trusted_by_text = Column(String(100), nullable=True)
    homepage_intro_enabled = Column(Boolean, default=True)
    homepage_contact_image_url = Column(String(500), nullable=True)
    homepage_contact_image_alt = Column(String(200), nullable=True)
    homepage_contact_heading = Column(String(200), nullable=True)
    homepage_contact_consent_text = Column(String(300), nullable=True)
    homepage_contact_button_label = Column(String(60), nullable=True)
    homepage_contact_success_message = Column(String(300), nullable=True)
    homepage_contact_enabled = Column(Boolean, default=True)
    refund_cancellation_policy_html = Column(Text, nullable=True)  # admin-managed public policy page
    privacy_policy_html = Column(Text, nullable=True)              # admin-managed public privacy policy page
    default_catalog_additional_information_html = Column(Text, nullable=True)  # common notes used by rugs without a product override
    product_accordion_sections = Column(JSON, nullable=True)  # ordered list[{"id": str, "title": str, "html": str}] — admin-managed accordion sections shown after the fixed "Product Details" section on the storefront rug detail page; as many as the vendor wants
    about_us_content_html = Column(Text, nullable=True)          # main editable narrative (Story section body) on the public About Us page
    about_page = Column(JSON, nullable=True)  # structured /about content: {hero, credentials, story, process, principles, founder, cta} — each an object with an `enabled` flag; see schemas.AboutPageContent. Missing keys fall back to the frontend's aboutPageDefaults.
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

    __table_args__ = (
        # Admin inventory list + the dashboard's low-stock count both filter
        # tenant_id together with a stock_meters threshold — see
        # app/api/routes/inventory.py and app/api/routes/dashboard.py.
        Index("ix_materials_tenant_stock", "tenant_id", "stock_meters"),
    )

    rugs = relationship("RugCatalog", back_populates="material")
    quotes = relationship("Quote", back_populates="material")
    inventory_transactions = relationship("InventoryTransaction", back_populates="material")


class RugCatalog(Base):
    __tablename__ = "rug_catalog"
    __table_args__ = (UniqueConstraint("slug", "tenant_id", name="uq_rug_slug_tenant"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(220), nullable=True, index=True)  # URL-friendly identifier for /catalog/<slug> — unique per tenant, see uq_rug_slug_tenant
    description = Column(Text, nullable=True)
    about_content_html = Column(Text, nullable=True)  # admin-authored rich text for the catalog detail "About this rug" section — falls back to `description` (plain text) when empty
    additional_information_html = Column(Text, nullable=True)  # admin-authored bullets, care notes, disclaimers, and other product information
    sizes = Column(JSON, nullable=False)  # list[{"ft": str, "cm": str | None}] — cm is vendor-entered, never computed from ft (see schemas.RugSize)
    base_price = Column(Float, nullable=False)
    base_price_currency = Column(String(10), nullable=True)     # currency base_price was entered in
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    pile_height = Column(String(50), nullable=True)
    weave_type = Column(String(100), nullable=True)
    lead_time_days = Column(Integer, default=21)
    image_url = Column(String(300), nullable=True)
    profit_margin_pct = Column(Float, nullable=True)
    hsn_code = Column(String(10), nullable=True, default="5703")  # HSN 5701-5705 for rugs
    room_types = Column(JSON, nullable=True)  # list[str] — "Shop by Space" tags, e.g. ["living_room", "bedroom"]
    mood_tags = Column(JSON, nullable=True)  # list[str] — "Shop by Mood" tags, e.g. ["warm_earthy", "quiet_luxury"]
    color_options = Column(JSON, nullable=True)  # list[{"name": str, "hex": "#RRGGBB"}] — customer-selectable rug colorways
    is_available = Column(Boolean, nullable=False, default=True)  # vendor-controlled storefront sellability
    inventory_quantity = Column(Integer, nullable=True)  # finished rug units; NULL preserves legacy/untracked catalogs

    material = relationship("Material", back_populates="rugs")
    quotes = relationship("Quote", back_populates="rug_catalog")
    images = relationship("RugImage", back_populates="rug_catalog", order_by="RugImage.sort_order", cascade="all, delete-orphan")


class CatalogSizeMaster(Base):
    __tablename__ = "catalog_size_master"
    __table_args__ = (UniqueConstraint("tenant_id", "ft", name="uq_catalog_size_master_tenant_ft"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    ft = Column(String(50), nullable=False)
    cm = Column(String(50), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)


class WeaveTypeMaster(Base):
    __tablename__ = "weave_type_master"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_weave_type_master_tenant_name"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)


class PileHeightMaster(Base):
    __tablename__ = "pile_height_master"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_pile_height_master_tenant_name"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)


class RugImage(Base):
    __tablename__ = "rug_images"

    id = Column(Integer, primary_key=True, index=True)
    rug_catalog_id = Column(Integer, ForeignKey("rug_catalog.id"), nullable=False, index=True)
    image_url = Column(String(300), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    rug_catalog = relationship("RugCatalog", back_populates="images")


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    rug_catalog_id = Column(Integer, ForeignKey("rug_catalog.id", ondelete="CASCADE"), nullable=True, index=True)
    question = Column(String(500), nullable=False)
    answer = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    rug_catalog = relationship("RugCatalog")

    __table_args__ = (
        Index("ix_faqs_tenant_rug_active_sort", "tenant_id", "rug_catalog_id", "is_active", "sort_order"),
    )


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
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
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
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    rug_catalog_id = Column(Integer, ForeignKey("rug_catalog.id"), nullable=True, index=True)
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
    selected_color = Column(String(100), nullable=True)  # selected catalog colorway snapshot
    vendor_notes = Column(Text, nullable=True)            # message from vendor when sending/adjusting
    customer_response_notes = Column(Text, nullable=True) # customer reason when accepting/rejecting
    review_request_count = Column(Integer, default=0)     # how many times customer has requested re-review
    is_custom_request = Column(Boolean, default=False)    # customer-submitted bespoke design brief, no catalog rug attached
    room_type = Column(String(100), nullable=True)        # custom request: intended room/purpose
    material_preference = Column(String(50), nullable=True)  # custom request: "wool"|"silk"|"cotton"|"synthetic"|"no_preference"
    budget_range = Column(String(100), nullable=True)     # custom request: preset band, e.g. "₹50,000–₹1,00,000"
    expected_delivery = Column(String(50), nullable=True)  # custom request: customer's preferred timeframe, e.g. "Within 4 weeks"
    request_group_id = Column(String(36), nullable=True, index=True)  # ties together multiple Quotes submitted as one multi-rug custom request, so the vendor can later combine their resulting orders
    reference_image_urls = Column(JSON, nullable=True)    # custom request: list[str] of inspiration images — up to 3 from the catalog "request a quote" form, up to 15 from the bespoke custom-rug-request form (see QuoteRequestBody/CustomRugRequestItem)
    vendor_sample_image_urls = Column(JSON, nullable=True)  # vendor-uploaded design samples sent back to the customer, list[str], up to 3
    revised_from_quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)  # set when this quote was cloned from a rejected one via "Revise & Resend"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # Dashboard/admin quote lists always filter tenant_id together with status,
        # or with a created_at sort for "recent" views — see app/api/routes/dashboard.py
        # and app/api/routes/quotes.py.
        Index("ix_quotes_tenant_status", "tenant_id", "status"),
        Index("ix_quotes_tenant_created", "tenant_id", "created_at"),
        # Customer portal ("My Quotes" + the "action needed" badge count) filters
        # customer_id together with status on every portal page load.
        Index("ix_quotes_customer_status", "customer_id", "status"),
    )

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
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True, index=True)  # first item's quote — back-compat pointer for single-item views
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
    recovered_via_webhook = Column(Boolean, default=False)  # True if created by the Razorpay webhook safety net (see PaymentAttempt) rather than the customer's browser completing checkout normally — same order, just worth knowing for support/audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # Admin order lists and the dashboard's status counts always filter tenant_id
        # together with status, or sort by created_at — see app/api/routes/orders.py
        # and app/api/routes/dashboard.py.
        Index("ix_orders_tenant_status", "tenant_id", "status"),
        Index("ix_orders_tenant_created", "tenant_id", "created_at"),
        Index("ux_orders_razorpay_payment_id", "razorpay_payment_id", unique=True),
    )

    quote = relationship("Quote", back_populates="order")
    items = relationship("OrderItem", back_populates="order")


class PaymentAttempt(Base):
    """
    A snapshot of checkout intent, written the moment a Razorpay order is created —
    *before* the customer pays — so a payment is never captured with zero trace of
    it in our system. Normally closed out by /verify-payment right after checkout;
    if that never happens (browser crash, lost connection, failed request after a
    successful charge), the Razorpay webhook uses this row to reconstruct the order
    on its own. See recover_order_from_payment_attempt() in api/routes/customer.py.
    """
    __tablename__ = "payment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    razorpay_order_id = Column(String(100), nullable=False, unique=True, index=True)
    customer_id_hint = Column(Integer, ForeignKey("customers.id"), nullable=True)  # set if checkout started while logged in
    payload = Column(JSON, nullable=False)  # snapshot of OrderDetailsBase (items/name/email/shipping_address/etc.) — everything /verify-payment would otherwise only have from the live request
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    status = Column(String(20), default="created")  # created -> completed | failed (see recover_order_from_payment_attempt for the "completing" transient lock state)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="items")
    quote = relationship("Quote")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    status = Column(String(50), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # Order-tracking timelines (customer + admin order detail) always filter by
        # order_id and sort by changed_at — see app/api/routes/customer.py.
        Index("ix_order_status_history_order_changed", "order_id", "changed_at"),
    )


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

    __table_args__ = (
        # Every promo validation/checkout looks up code together with tenant_id —
        # see app/services/promo_engine.py.
        Index("ix_promo_codes_tenant_code", "tenant_id", "code"),
    )

    redemptions = relationship("PromoRedemption", back_populates="promo_code", cascade="all, delete-orphan")


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    discount_amount = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # The "one redemption per customer" check filters both together on every
        # promo-code checkout attempt — see app/services/promo_engine.py.
        Index("ix_promo_redemptions_code_customer", "promo_code_id", "customer_id"),
    )

    promo_code = relationship("PromoCode", back_populates="redemptions")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
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
    tab_name = Column(String(100), nullable=True)  # admin-managed "See It Made" tab; ignored for intro videos
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CustomRugPageImage(Base):
    __tablename__ = "custom_rug_page_images"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_custom_rug_page_images_tenant_sort", "tenant_id", "sort_order"),
    )


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


class RugJourneyStep(Base):
    __tablename__ = "rug_journey_steps"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnnouncementMessage(Base):
    __tablename__ = "announcement_messages"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    text = Column(String(200), nullable=False)  # e.g. "Free shipping worldwide this month"
    link_url = Column(String(300), nullable=True)  # optional — makes the message clickable
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
    image_url = Column(String(300), nullable=False)  # cover image — additional photos live in ProjectGalleryImage, same "cover + gallery" split as RugCatalog.image_url/RugImage
    caption = Column(String(150), nullable=True)
    link_url = Column(String(300), nullable=True)  # optional external link; when unset, the customer-facing tile links to this project's own /project-gallery/:id detail page
    description = Column(Text, nullable=True)  # project write-up shown on the single-project detail page
    owner_name = Column(String(150), nullable=True)  # the rug owner/customer who left the message below
    owner_message = Column(Text, nullable=True)  # a personal note from that customer about the finished project
    rating = Column(Integer, nullable=True)  # 1-5, same scale as Testimonial.rating
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("ProjectGalleryImage", back_populates="project_gallery_item", order_by="ProjectGalleryImage.sort_order")


class ProjectGalleryImage(Base):
    __tablename__ = "project_gallery_images"

    id = Column(Integer, primary_key=True, index=True)
    project_gallery_item_id = Column(Integer, ForeignKey("project_gallery_items.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(300), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project_gallery_item = relationship("ProjectGalleryItem", back_populates="images")


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    email = Column(String(200), nullable=False)
    source = Column(String(50), nullable=True)  # e.g. "homepage_footer"
    subscribed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("email", "tenant_id", name="uq_newsletter_email_tenant"),
        # Admin subscriber list filters tenant_id and sorts by subscribed_at —
        # see app/api/routes/newsletter.py. Unbounded growth (one row per signup).
        Index("ix_newsletter_tenant_subscribed", "tenant_id", "subscribed_at"),
    )


class HomepageEnquiry(Base):
    __tablename__ = "homepage_enquiries"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    email = Column(String(200), nullable=False)
    subject = Column(String(250), nullable=False)
    message = Column(Text, nullable=False)
    consent = Column(Boolean, nullable=False, default=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_homepage_enquiries_tenant_created", "tenant_id", "created_at"),
        Index("ix_homepage_enquiries_tenant_read", "tenant_id", "is_read"),
    )


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

    __table_args__ = (
        # Theft-detection (a revoked token being replayed) looks up by user
        # identity — see core/auth.py. This table only grows, one row per
        # login/refresh, so it's worth indexing preventively even though today's
        # traffic is modest.
        Index("ix_refresh_tokens_user", "user_type", "user_id", "revoked_at"),
    )


class PendingAiAction(Base):
    """A write the AI assistant (app/services/ai_agent.py) wants to make, staged
    for a human to review before it touches real data. A write tool never calls
    db.commit() on the target table directly — it only ever creates one of these
    rows; the actual create/update/delete happens in the confirm endpoint
    (app/api/routes/chat.py), reusing the exact same helper functions the normal
    admin-panel routes call, so AI-confirmed and human-typed writes can never
    diverge in behavior."""
    __tablename__ = "pending_ai_actions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    session_id = Column(String(100), nullable=True)
    action_type = Column(String(20), nullable=False)   # "create" | "update" | "delete"
    entity_type = Column(String(30), nullable=False)   # "rug_catalog" | "material" | "promo_code"
    entity_id = Column(Integer, nullable=True)          # target row id for update/delete; null for create
    payload = Column(JSON, nullable=False)               # proposed field values, validated against the entity's Pydantic schema before this row is created
    summary = Column(Text, nullable=False)                # human-readable one-liner shown on the confirm card
    status = Column(String(20), nullable=False, default="pending")  # "pending" | "confirmed" | "rejected"
    created_by_staff_id = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_pending_ai_actions_tenant_status", "tenant_id", "status"),
    )


class ApiClient(Base):
    """A partner/integration credential for the public API (app/api/routes/public_api.py).
    Auth is a single opaque key sent as X-Api-Key — like RefreshToken, only its
    hash is ever stored; the raw key is shown to the vendor exactly once, at
    creation time, and can never be retrieved again."""
    __tablename__ = "api_clients"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)  # vendor-given label, e.g. "Partner ERP sync"
    key_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256 hex digest
    key_prefix = Column(String(16), nullable=False)  # first chars of the raw key, shown in the UI for identification
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)


class McpOAuthClient(Base):
    """OAuth public client registered by ChatGPT through RFC 7591 DCR."""
    __tablename__ = "mcp_oauth_clients"

    id = Column(Integer, primary_key=True)
    client_id = Column(String(128), nullable=False, unique=True, index=True)
    client_name = Column(String(200), nullable=True)
    redirect_uris = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class McpOAuthAuthorizationRequest(Base):
    """Short-lived browser login transaction; the opaque ID is stored hashed."""
    __tablename__ = "mcp_oauth_authorization_requests"

    id = Column(Integer, primary_key=True)
    transaction_hash = Column(String(64), nullable=False, unique=True, index=True)
    client_id = Column(String(128), nullable=False, index=True)
    redirect_uri = Column(String(1000), nullable=False)
    state = Column(String(500), nullable=True)
    scopes = Column(JSON, nullable=False)
    code_challenge = Column(String(128), nullable=False)
    resource = Column(String(1000), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class McpOAuthAuthorizationCode(Base):
    __tablename__ = "mcp_oauth_authorization_codes"

    id = Column(Integer, primary_key=True)
    code_hash = Column(String(64), nullable=False, unique=True, index=True)
    client_id = Column(String(128), nullable=False, index=True)
    staff_user_id = Column(Integer, ForeignKey("staff_users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    redirect_uri = Column(String(1000), nullable=False)
    scopes = Column(JSON, nullable=False)
    code_challenge = Column(String(128), nullable=False)
    resource = Column(String(1000), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class McpOAuthToken(Base):
    """Hashed OAuth access/refresh token. Raw credentials are never persisted."""
    __tablename__ = "mcp_oauth_tokens"

    id = Column(Integer, primary_key=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    token_type = Column(String(10), nullable=False)  # access | refresh
    client_id = Column(String(128), nullable=False, index=True)
    staff_user_id = Column(Integer, ForeignKey("staff_users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    scopes = Column(JSON, nullable=False)
    resource = Column(String(1000), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class McpCatalogUploadGrant(Base):
    """One-time, short-lived credential for direct multipart catalog uploads."""
    __tablename__ = "mcp_catalog_upload_grants"

    id = Column(Integer, primary_key=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AiChatMessage(Base):
    """One turn of the vendor AI Assistant conversation (app/services/ai_agent.py),
    persisted for history/audit — the frontend only holds the live conversation
    in memory, so this is the only durable record of what was asked and answered.
    Named AiChatMessage (not ChatMessage) to avoid clashing with the Pydantic
    request/response schema of the same short name in schemas.py."""
    __tablename__ = "ai_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    role = Column(String(20), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_ai_chat_messages_tenant_session", "tenant_id", "session_id", "created_at"),
    )


class CollectionDisplay(Base):
    __tablename__ = "collection_displays"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(150), nullable=False)
    enabled = Column(Boolean, nullable=False, default=False)
    images = Column(JSON, nullable=False)
    __table_args__ = (UniqueConstraint("tenant_id", "category", name="uq_collection_display_tenant_category"),)
