"""Migration v42: payment idempotency and recoverable processing claims."""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run() -> None:
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate")
        return
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    columns = {row[1] for row in cursor.execute("PRAGMA table_info(payment_attempts)")}
    for name, sql_type in (("processing_started_at", "DATETIME"), ("last_error", "TEXT")):
        if name not in columns:
            cursor.execute(f"ALTER TABLE payment_attempts ADD COLUMN {name} {sql_type}")
            print(f"  + Added payment_attempts.{name}")
        else:
            print(f"  . Already exists payment_attempts.{name}")
    duplicates = cursor.execute(
        "SELECT razorpay_payment_id FROM orders WHERE razorpay_payment_id IS NOT NULL "
        "GROUP BY razorpay_payment_id HAVING COUNT(*) > 1"
    ).fetchall()
    if duplicates:
        raise RuntimeError("Duplicate Razorpay payment IDs exist; resolve them before creating the unique index")
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_razorpay_payment_id "
        "ON orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL"
    )
    print("  + Ensured unique Razorpay payment ID index")
    connection.commit()
    connection.close()


if __name__ == "__main__":
    run()
