"""
Migration v12: Order status history table.

Adds the `order_status_history` table — each admin-triggered status change
via PATCH /orders/{id}/status (app/api/routes/orders.py) now inserts a row
here, timestamping the transition. Powers the timeline shown on the
customer-facing My Orders page (GET /customer/orders/{id}/timeline).

Run once:  python3 migrate_v12_order_status_history.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            status VARCHAR(50) NOT NULL,
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_order_status_history_order_id ON order_status_history (order_id)")

    conn.commit()
    conn.close()
    print("Migration v12 complete: order_status_history table ready.")


if __name__ == "__main__":
    run()
