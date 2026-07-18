"""
Seed the database with a demo tenant, admin user, and realistic rug manufacturing data.
Run: python seed_data.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, init_db
from app.core.auth import hash_password
from app.models.models import (
    Tenant,
    StaffUser,
    Material,
    RugCatalog,
    PricingRule,
    MOQRule,
    ProductionTimeline,
    Customer,
    Quote,
    Order,
    InventoryTransaction,
)
from datetime import datetime, timedelta


def seed():
    init_db()
    db = SessionLocal()

    # ── Clear existing data (order matters for FK constraints) ─────────────────
    db.query(InventoryTransaction).delete()
    db.query(Order).delete()
    db.query(Quote).delete()
    db.query(Customer).delete()
    db.query(RugCatalog).delete()
    db.query(Material).delete()
    db.query(PricingRule).delete()
    db.query(MOQRule).delete()
    db.query(ProductionTimeline).delete()
    db.query(StaffUser).delete()
    db.query(Tenant).delete()
    db.commit()

    # ── Demo Tenant ────────────────────────────────────────────────────────────
    tenant = Tenant(
        name="LoomCraft Demo",
        slug="loomcraft-demo",
        gstin=None,
        base_currency="INR",
        currency="INR",
        exchange_rates={"USD": 0.012, "EUR": 0.011, "GBP": 0.0094},
        default_profit_margin_pct=40.0,
        default_gst_pct=12.0,
        plan="starter",
        is_active=True,
    )
    db.add(tenant)
    db.flush()

    # ── Admin User ─────────────────────────────────────────────────────────────
    admin = StaffUser(
        tenant_id=tenant.id,
        email="admin@loomcraft.demo",
        hashed_password=hash_password("demo1234"),
        full_name="Demo Admin",
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.flush()

    tid = tenant.id

    # ── Materials (all costs in INR) ───────────────────────────────────────────
    materials = [
        Material(tenant_id=tid, name="Pakistani Wool",                   type="wool",      color="Natural/Off-white", stock_meters=850.0,  cost_per_sqm=1800.00, cost_currency="INR", is_available=True),
        Material(tenant_id=tid, name="Silk Blend (60% Silk / 40% Wool)", type="silk",      color="Ivory / Multi",     stock_meters=320.0,  cost_per_sqm=3500.00, cost_currency="INR", is_available=True),
        Material(tenant_id=tid, name="Egyptian Cotton",                  type="cotton",    color="Natural White",     stock_meters=600.0,  cost_per_sqm=1200.00, cost_currency="INR", is_available=True),
        Material(tenant_id=tid, name="Premium Synthetic (Polypropylene)",type="synthetic", color="Multi / Various",   stock_meters=1200.0, cost_per_sqm=750.00,  cost_currency="INR", is_available=True),
        Material(tenant_id=tid, name="Tibetan Highland Wool",            type="wool",      color="Natural Undyed",    stock_meters=42.0,   cost_per_sqm=2800.00, cost_currency="INR", is_available=True),
        Material(tenant_id=tid, name="Merino Wool Blend",                type="wool",      color="Cream / Beige",     stock_meters=380.0,  cost_per_sqm=2000.00, cost_currency="INR", is_available=True),
    ]
    db.add_all(materials)
    db.flush()

    # ── Rug Catalog (all base prices in INR per sqm) ───────────────────────────
    rugs = [
        # ── Real product images ────────────────────────────────────────────────
        RugCatalog(tenant_id=tid, name="Moroccan Series — Sage Green",     description="Lush sage green Moroccan-style rug with traditional geometric medallion pattern. Hand-knotted wool pile, rich colour depth, perfect for living rooms and dining spaces.", sizes=["2x3", "3x5", "4x6", "5x8", "6x9", "8x10"], base_price=3800.00, base_price_currency="INR", material_id=materials[0].id, pile_height="medium", weave_type="hand-knotted", lead_time_days=30, image_url="/rugs/rug-moroccan-green.png"),
        RugCatalog(tenant_id=tid, name="Moroccan Series — Terracotta",     description="Warm terracotta and burnt orange tones in a traditional Moroccan geometric pattern. Hand-knotted with premium wool for lasting softness and vibrant colour.", sizes=["2x3", "3x5", "4x6", "5x8", "6x9", "8x10"], base_price=3800.00, base_price_currency="INR", material_id=materials[0].id, pile_height="medium", weave_type="hand-knotted", lead_time_days=30, image_url="/rugs/rug-moroccan-orange.png"),
        RugCatalog(tenant_id=tid, name="Moroccan Series — Deep Red",       description="Bold deep red Moroccan rug with intricate traditional motifs. A statement piece that anchors any room with warmth and heritage craftsmanship.", sizes=["2x3", "3x5", "4x6", "5x8", "6x9", "8x10"], base_price=3800.00, base_price_currency="INR", material_id=materials[0].id, pile_height="medium", weave_type="hand-knotted", lead_time_days=30, image_url="/rugs/rug-moroccan-red.png"),
        # ── Additional catalog ─────────────────────────────────────────────────
        RugCatalog(tenant_id=tid, name="Traditional Persian Medallion",   description="Classic Persian medallion design with intricate floral borders. Hand-knotted using traditional techniques passed down over generations.", sizes=["2x3", "3x5", "4x6", "6x9", "8x10", "9x12"], base_price=3500.00, base_price_currency="INR", material_id=materials[0].id, pile_height="medium",   weave_type="hand-knotted",   lead_time_days=35, image_url="/rugs/rug-persian.jpg"),
        RugCatalog(tenant_id=tid, name="Modern Geometric Flatweave",       description="Contemporary geometric pattern perfect for modern interiors. Durable flatweave construction, easy to clean.",                          sizes=["2x3", "4x6", "5x8", "6x9", "8x10"],        base_price=2200.00, base_price_currency="INR", material_id=materials[2].id, pile_height="flat",     weave_type="flatweave",      lead_time_days=14, image_url="/rugs/rug-geometric.jpg"),
        RugCatalog(tenant_id=tid, name="Luxury Silk Tabriz",               description="Premium hand-knotted silk rug with ultra-fine knot count. Museum-quality craftsmanship with rich jewel tones.",                        sizes=["2x3", "3x5", "4x6", "6x9"],                base_price=8500.00, base_price_currency="INR", material_id=materials[1].id, pile_height="low",      weave_type="hand-knotted",   lead_time_days=60, image_url="/rugs/rug-tabriz.jpg"),
        RugCatalog(tenant_id=tid, name="Moroccan Beni Ourain Style",       description="Minimalist Berber-inspired design with cream base and charcoal geometric symbols. Deep pile for ultimate comfort.",                    sizes=["3x5", "4x6", "5x8", "6x9", "8x10"],        base_price=4500.00, base_price_currency="INR", material_id=materials[4].id, pile_height="high",     weave_type="hand-tufted",    lead_time_days=28, image_url="/rugs/rug-beni-ourain.jpg"),
        RugCatalog(tenant_id=tid, name="Scandinavian Minimalist",          description="Clean lines and muted palette inspired by Nordic design.",                                                                             sizes=["2x3", "4x6", "5x8", "6x9"],                base_price=3200.00, base_price_currency="INR", material_id=materials[5].id, pile_height="medium",   weave_type="hand-tufted",    lead_time_days=21, image_url="/rugs/rug-scandinavian.jpg"),
        RugCatalog(tenant_id=tid, name="Indoor/Outdoor Synthetic Weave",   description="Weather-resistant synthetic rug for patios, sunrooms, and high-traffic areas.",                                                       sizes=["2x3", "4x6", "5x8", "8x10", "9x12"],       base_price=1400.00, base_price_currency="INR", material_id=materials[3].id, pile_height="low",      weave_type="machine-woven",  lead_time_days=7,  image_url="/rugs/rug-outdoor.jpg"),
        RugCatalog(tenant_id=tid, name="Oushak Vintage Revival",           description="Inspired by antique Turkish Oushak rugs. Soft muted tones with spacious, elegant floral patterns.",                                   sizes=["3x5", "4x6", "6x9", "8x10", "10x14"],      base_price=4200.00, base_price_currency="INR", material_id=materials[0].id, pile_height="medium",   weave_type="hand-knotted",   lead_time_days=42, image_url="/rugs/rug-oushak.jpg"),
        RugCatalog(tenant_id=tid, name="Contemporary Abstract Art Rug",    description="Bold abstract pattern designed by our in-house artists. Each piece is unique.",                                                        sizes=["4x6", "5x8", "6x9", "8x10"],               base_price=4000.00, base_price_currency="INR", material_id=materials[5].id, pile_height="medium",   weave_type="hand-tufted",    lead_time_days=30, image_url="/rugs/rug-abstract.jpg"),
    ]
    db.add_all(rugs)
    db.flush()

    # ── Pricing Rules ──────────────────────────────────────────────────────────
    pricing_rules = [
        PricingRule(tenant_id=tid, name="Bulk Discount (10+ pieces)", rule_type="bulk_discount", min_qty=10.0, multiplier=0.85, description="Orders of 10 or more pieces receive a 15% bulk discount."),
        PricingRule(tenant_id=tid, name="Mid-Volume Discount (5-9 pieces)", rule_type="bulk_discount", min_qty=5.0, max_qty=9.0, multiplier=0.93, description="Orders of 5–9 pieces receive a 7% discount."),
        PricingRule(tenant_id=tid, name="Rush Order Surcharge (<7 days)", rule_type="rush_fee", multiplier=1.25, description="Rush orders carry a 25% surcharge."),
        PricingRule(tenant_id=tid, name="Large Format Surcharge (>20 sqm per piece)", rule_type="size_multiplier", min_qty=20.0, multiplier=1.05, description="Rugs exceeding 20 sqm carry a 5% surcharge."),
        PricingRule(tenant_id=tid, name="Custom Design Fee", rule_type="custom_work", flat_fee=350.00, description="Flat fee for custom design work."),
    ]
    db.add_all(pricing_rules)

    # ── MOQ Rules ──────────────────────────────────────────────────────────────
    moq_rules = [
        MOQRule(tenant_id=tid, rug_type="custom", minimum_sqm=4.0, notes="All custom-size orders must be at least 4 sqm."),
        MOQRule(tenant_id=tid, rug_type="catalog", minimum_pieces=2, notes="Standard catalog orders require a minimum of 2 pieces."),
        MOQRule(tenant_id=tid, rug_type="hand-knotted", minimum_sqm=6.0, minimum_pieces=1, notes="Hand-knotted rugs require a minimum of 6 sqm per order."),
        MOQRule(tenant_id=tid, rug_type="flatweave", minimum_pieces=4, notes="Flatweave rugs: minimum 4 pieces per order."),
        MOQRule(tenant_id=tid, rug_type="machine-woven", minimum_pieces=10, notes="Machine-woven orders: minimum 10 pieces per run."),
    ]
    db.add_all(moq_rules)

    # ── Production Timelines ──────────────────────────────────────────────────
    timelines = [
        ProductionTimeline(tenant_id=tid, order_type="standard", base_days=21, complexity_multiplier_per_sqm=0.3),
        ProductionTimeline(tenant_id=tid, order_type="custom", base_days=35, complexity_multiplier_per_sqm=0.5),
        ProductionTimeline(tenant_id=tid, order_type="rush", base_days=7, complexity_multiplier_per_sqm=0.7),
        ProductionTimeline(tenant_id=tid, order_type="hand-knotted", base_days=35, complexity_multiplier_per_sqm=1.2),
        ProductionTimeline(tenant_id=tid, order_type="hand-tufted", base_days=21, complexity_multiplier_per_sqm=0.4),
        ProductionTimeline(tenant_id=tid, order_type="flatweave", base_days=14, complexity_multiplier_per_sqm=0.2),
        ProductionTimeline(tenant_id=tid, order_type="machine-woven", base_days=7, complexity_multiplier_per_sqm=0.1),
    ]
    db.add_all(timelines)

    # ── Customers ──────────────────────────────────────────────────────────────
    customers = [
        Customer(tenant_id=tid, name="Sarah Mitchell", email="sarah.mitchell@interiordesigns.com", phone="+1-555-0142", company="Mitchell Interior Designs LLC"),
        Customer(tenant_id=tid, name="James Thornton", email="j.thornton@luxuryhotels.com", phone="+1-555-0287", company="Grand Thornton Hotel Group"),
        Customer(tenant_id=tid, name="Priya Sharma", email="priya@homefurnishings.in", phone="+91-98765-43210", company="Sharma Home Furnishings"),
    ]
    db.add_all(customers)
    db.flush()

    # ── Quotes (all prices in INR) ─────────────────────────────────────────────
    # Q1: Sarah, Persian Medallion 4×6m × 3 pcs — Wool ₹1800/sqm × 1.40 = ₹2520/sqm → 72sqm = ₹181,440 subtotal, no discount
    # Q2: James, Outdoor Synthetic 3×5m × 15 pcs — PP ₹750/sqm × 1.40 = ₹1050/sqm → 225sqm = ₹236,250 − 15% bulk = ₹200,813
    # Q3: Priya, Silk Tabriz 2×3m × 1 pc rush   — Silk ₹3500/sqm × 1.40 = ₹4900/sqm → 6sqm = ₹29,400 + 25% rush = ₹36,750
    quotes = [
        Quote(tenant_id=tid, customer_id=customers[0].id, rug_catalog_id=rugs[0].id, custom_size_w=4.0, custom_size_h=6.0, material_id=materials[0].id, qty=3,  base_price=181440.00, final_price=181440.00, price_currency="INR", rush_order=False, status="accepted", notes="For client's living room renovation project."),
        Quote(tenant_id=tid, customer_id=customers[1].id, rug_catalog_id=rugs[5].id, custom_size_w=3.0, custom_size_h=5.0, material_id=materials[3].id, qty=15, base_price=236250.00, final_price=200813.00, price_currency="INR", rush_order=False, status="sent",     notes="Hotel lobby and corridor placement."),
        Quote(tenant_id=tid, customer_id=customers[2].id, rug_catalog_id=rugs[2].id, custom_size_w=2.0, custom_size_h=3.0, material_id=materials[1].id, qty=1,  base_price=29400.00,  final_price=36750.00,  price_currency="INR", rush_order=True,  status="draft",    notes="Gift order — urgent."),
    ]
    db.add_all(quotes)
    db.flush()

    # ── Orders ─────────────────────────────────────────────────────────────────
    now = datetime.utcnow()
    orders = [
        Order(tenant_id=tid, quote_id=quotes[0].id, status="in_production", estimated_delivery=now + timedelta(days=28)),
    ]
    db.add_all(orders)

    # ── Inventory Transactions ─────────────────────────────────────────────────
    transactions = [
        InventoryTransaction(tenant_id=tid, material_id=materials[0].id, qty_change=500.0, transaction_type="restock", notes="Initial inventory load - Pakistani Wool"),
        InventoryTransaction(tenant_id=tid, material_id=materials[0].id, qty_change=-72.0, transaction_type="used", notes="Used for Quote #1 - Persian Medallion order"),
        InventoryTransaction(tenant_id=tid, material_id=materials[1].id, qty_change=350.0, transaction_type="restock", notes="Initial inventory load - Silk Blend"),
        InventoryTransaction(tenant_id=tid, material_id=materials[3].id, qty_change=1200.0, transaction_type="restock", notes="Initial inventory load - Premium Synthetic"),
        InventoryTransaction(tenant_id=tid, material_id=materials[4].id, qty_change=50.0, transaction_type="restock", notes="Initial inventory load - Tibetan Highland Wool"),
        InventoryTransaction(tenant_id=tid, material_id=materials[4].id, qty_change=-8.0, transaction_type="used", notes="Sample rugs production"),
    ]
    db.add_all(transactions)

    tenant_name = tenant.name
    tenant_slug = tenant.slug
    db.commit()
    db.close()

    print("✓ Database seeded successfully!")
    print(f"  Tenant:  '{tenant_name}' (slug: {tenant_slug})")
    print(f"  Login:   admin@loomcraft.demo / demo1234")
    print(f"  Data:    {len(materials)} materials, {len(rugs)} rugs, {len(customers)} customers, {len(quotes)} quotes, {len(orders)} orders")


if __name__ == "__main__":
    seed()
