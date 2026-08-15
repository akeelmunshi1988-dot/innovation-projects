"""
Migration v32: Payment recovery safety net.

Adds:
  orders.recovered_via_webhook   (BOOLEAN, default 0) — audit flag, set True when
                                  an order was reconstructed by the Razorpay webhook
                                  rather than created normally via /verify-payment.

  payment_attempts               (new table) — a snapshot of checkout intent written
                                  the moment a Razorpay order is created, before the
                                  customer pays. Lets the webhook reconstruct an order
                                  if the browser never completes the normal flow after
                                  a successful charge (crash, lost connection, etc.).

Run once:  python3 migrate_v32_payment_recovery.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include this)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not column_exists(cur, "orders", "recovered_via_webhook"):
        cur.execute("ALTER TABLE orders ADD COLUMN recovered_via_webhook BOOLEAN DEFAULT 0")
        print("  + Added column: orders.recovered_via_webhook")
    else:
        print("  . Already exists: orders.recovered_via_webhook")

    if not table_exists(cur, "payment_attempts"):
        cur.execute("""
            CREATE TABLE payment_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER REFERENCES tenants(id),
                razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
                customer_id_hint INTEGER REFERENCES customers(id),
                payload JSON NOT NULL,
                amount FLOAT NOT NULL,
                currency VARCHAR(10) NOT NULL,
                status VARCHAR(20) DEFAULT 'created',
                order_id INTEGER REFERENCES orders(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            )
        """)
        cur.execute("CREATE INDEX ix_payment_attempts_razorpay_order_id ON payment_attempts (razorpay_order_id)")
        print("  + Created table: payment_attempts")
    else:
        print("  . Already exists: payment_attempts")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
