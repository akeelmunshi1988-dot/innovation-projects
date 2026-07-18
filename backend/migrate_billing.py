"""
Run once to add billing columns to the tenants table in the existing SQLite DB.
Usage: python migrate_billing.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include these columns)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(tenants)")
    existing = {row[1] for row in cur.fetchall()}

    new_cols = [
        ("plan_status",               "VARCHAR(20) DEFAULT 'trial'"),
        ("razorpay_customer_id",       "VARCHAR(100)"),
        ("razorpay_subscription_id",   "VARCHAR(100)"),
        ("ai_credits_used",            "INTEGER DEFAULT 0"),
        ("billing_cycle_start",        "DATETIME"),
    ]

    for col_name, col_def in new_cols:
        if col_name not in existing:
            cur.execute(f"ALTER TABLE tenants ADD COLUMN {col_name} {col_def}")
            print(f"  + Added column: {col_name}")
        else:
            print(f"  . Already exists: {col_name}")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    migrate()
