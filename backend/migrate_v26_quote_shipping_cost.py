"""
Migration v26: Custom quote shipping cost.

Adds:
  quotes.shipping_cost (REAL, nullable) — vendor-set flat shipping charge added
    to a custom rug request's material-calculated price, shown in the pricing
    breakdown before it's sent to the customer.

Run once:  python3 migrate_v26_quote_shipping_cost.py
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

    if not column_exists(cur, "quotes", "shipping_cost"):
        cur.execute("ALTER TABLE quotes ADD COLUMN shipping_cost REAL")
        print("  Added quotes.shipping_cost")
    else:
        print("  Skipped quotes.shipping_cost (already exists)")

    conn.commit()
    conn.close()
    print("Migration v26 complete.")


if __name__ == "__main__":
    run()
