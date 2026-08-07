"""
Migration v17: Promo codes.

Adds:
  promo_codes table — admin-managed discount codes (percentage / flat / free_shipping),
    with optional expiry window, minimum order value, total-use cap, and a
    one-redemption-per-customer flag.
  promo_redemptions table — one row per successful redemption, used to compute
    used_count and to enforce the one-per-customer rule without a race-prone counter.
  orders.promo_code, orders.discount_amount — what was actually applied to a
    given order, for display on the order/invoice.

Run once:  python3 migrate_v17_promo_codes.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS promo_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER REFERENCES tenants(id),
            code VARCHAR(50) NOT NULL,
            discount_type VARCHAR(20) NOT NULL,
            discount_value FLOAT,
            min_order_value FLOAT,
            max_uses INTEGER,
            one_per_customer BOOLEAN DEFAULT 0,
            starts_at DATETIME,
            expires_at DATETIME,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_promo_codes_tenant_id ON promo_codes (tenant_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS promo_redemptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
            customer_id INTEGER REFERENCES customers(id),
            order_id INTEGER REFERENCES orders(id),
            discount_amount FLOAT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_promo_redemptions_promo_code_id ON promo_redemptions (promo_code_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_promo_redemptions_customer_id ON promo_redemptions (customer_id)")

    if not column_exists(cur, "orders", "promo_code"):
        cur.execute("ALTER TABLE orders ADD COLUMN promo_code VARCHAR(50)")
        print("  Added orders.promo_code")
    else:
        print("  Skipped orders.promo_code (already exists)")

    if not column_exists(cur, "orders", "discount_amount"):
        cur.execute("ALTER TABLE orders ADD COLUMN discount_amount FLOAT")
        print("  Added orders.discount_amount")
    else:
        print("  Skipped orders.discount_amount (already exists)")

    conn.commit()
    conn.close()
    print("Migration v17 complete.")


if __name__ == "__main__":
    run()
