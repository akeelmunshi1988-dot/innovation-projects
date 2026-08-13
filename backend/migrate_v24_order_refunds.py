"""
Migration v24: Order cancellation + Razorpay refunds.

Adds:
  tenants.cancellation_window_hours (INTEGER default 24) — how long after
    placing an order it stays eligible for cancellation.
  orders.razorpay_payment_id (TEXT, nullable) — captured at checkout, needed
    to issue a refund. Null for COD/manual orders.
  orders.refund_id            (TEXT, nullable) — Razorpay refund id once issued.
  orders.refund_status        (TEXT, nullable) — Razorpay's refund status.
  orders.refund_amount        (REAL, nullable) — amount actually refunded.
  orders.refunded_at          (TIMESTAMP, nullable)

Run once:  python3 migrate_v24_order_refunds.py
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

    migrations = [
        ("tenants", "cancellation_window_hours", "INTEGER DEFAULT 24"),
        ("orders", "razorpay_payment_id", "TEXT"),
        ("orders", "refund_id", "TEXT"),
        ("orders", "refund_status", "TEXT"),
        ("orders", "refund_amount", "REAL"),
        ("orders", "refunded_at", "TIMESTAMP"),
    ]
    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    cur.execute("UPDATE tenants SET cancellation_window_hours = 24 WHERE cancellation_window_hours IS NULL")

    conn.commit()
    conn.close()
    print("Migration v24 complete.")


if __name__ == "__main__":
    run()
