"""
Migration v33: Indexing pass across the schema.

Adds indexes matching this app's actual query patterns (tenant-scoped admin
lists filtering by status/date, customer-portal lookups by customer_id,
foreign-key join columns that SQLite does not index automatically, etc.) —
see the corresponding Index(...)/index=True additions in app/models/models.py
for the reasoning behind each one.

Safe to run repeatedly — every statement is IF NOT EXISTS.

Run once:  python3 migrate_v33_db_indexes.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")

# (index_name, table, [columns])
INDEXES = [
    # Single-column (FK / lookup columns SQLite doesn't index automatically)
    ("ix_quotes_customer_id", "quotes", ["customer_id"]),
    ("ix_quotes_rug_catalog_id", "quotes", ["rug_catalog_id"]),
    ("ix_orders_quote_id", "orders", ["quote_id"]),
    ("ix_order_items_order_id", "order_items", ["order_id"]),
    ("ix_order_items_quote_id", "order_items", ["quote_id"]),
    ("ix_inventory_transactions_material_id", "inventory_transactions", ["material_id"]),
    ("ix_rug_catalog_tenant_id", "rug_catalog", ["tenant_id"]),
    ("ix_rug_catalog_material_id", "rug_catalog", ["material_id"]),
    ("ix_rug_images_rug_catalog_id", "rug_images", ["rug_catalog_id"]),
    ("ix_customers_tenant_id", "customers", ["tenant_id"]),

    # Composite (match actual multi-column WHERE/ORDER BY combinations)
    ("ix_quotes_tenant_status", "quotes", ["tenant_id", "status"]),
    ("ix_quotes_tenant_created", "quotes", ["tenant_id", "created_at"]),
    ("ix_quotes_customer_status", "quotes", ["customer_id", "status"]),
    ("ix_orders_tenant_status", "orders", ["tenant_id", "status"]),
    ("ix_orders_tenant_created", "orders", ["tenant_id", "created_at"]),
    ("ix_order_status_history_order_changed", "order_status_history", ["order_id", "changed_at"]),
    ("ix_promo_codes_tenant_code", "promo_codes", ["tenant_id", "code"]),
    ("ix_promo_redemptions_code_customer", "promo_redemptions", ["promo_code_id", "customer_id"]),
    ("ix_materials_tenant_stock", "materials", ["tenant_id", "stock_meters"]),
    ("ix_refresh_tokens_user", "refresh_tokens", ["user_type", "user_id", "revoked_at"]),
    ("ix_newsletter_tenant_subscribed", "newsletter_subscribers", ["tenant_id", "subscribed_at"]),
]


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include these)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for name, table, columns in INDEXES:
        cols_sql = ", ".join(columns)
        cur.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({cols_sql})")
        print(f"  + {name} ON {table} ({cols_sql})")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
