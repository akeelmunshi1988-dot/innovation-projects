"""
Migration v18: Shipping rate settings.

Adds:
  tenants.default_shipping_rate — flat shipping charge shown to customers at
    checkout and added to the amount charged. Null/0 = free shipping.
  orders.shipping_cost — snapshot of the shipping charge actually applied to
    a given order at checkout time; admin-editable afterward (e.g. corrected
    when the order is marked Shipped and the real carrier cost is known).

Run once:  python3 migrate_v18_shipping.py
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

    if not column_exists(cur, "tenants", "default_shipping_rate"):
        cur.execute("ALTER TABLE tenants ADD COLUMN default_shipping_rate FLOAT")
        print("  Added tenants.default_shipping_rate")
    else:
        print("  Skipped tenants.default_shipping_rate (already exists)")

    if not column_exists(cur, "orders", "shipping_cost"):
        cur.execute("ALTER TABLE orders ADD COLUMN shipping_cost FLOAT")
        print("  Added orders.shipping_cost")
    else:
        print("  Skipped orders.shipping_cost (already exists)")

    conn.commit()
    conn.close()
    print("Migration v18 complete.")


if __name__ == "__main__":
    run()
