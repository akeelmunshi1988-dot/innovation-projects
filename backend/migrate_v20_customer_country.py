"""
Migration v20: Customer shipping country.

Adds:
  customers.country — shipping country captured at checkout (defaults to
    "India"). Drives customers.is_export_buyer, which zero-rates GST at
    checkout and marks invoices as export invoices for non-Indian shipments.

Run once:  python3 migrate_v20_customer_country.py
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

    if not column_exists(cur, "customers", "country"):
        cur.execute("ALTER TABLE customers ADD COLUMN country VARCHAR(100) DEFAULT 'India'")
        cur.execute("UPDATE customers SET country = 'India' WHERE country IS NULL")
        print("  Added customers.country")
    else:
        print("  Skipped customers.country (already exists)")

    conn.commit()
    conn.close()
    print("Migration v20 complete.")


if __name__ == "__main__":
    run()
