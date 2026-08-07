"""
Migration v14: Multi-item orders (shopping cart).

Adds:
  order_items table — one row per rug in an order (order_id, quote_id).
    Each item is still backed by its own Quote row, exactly like today's
    single-item orders — this table just lets an Order reference more than one.

Makes orders.quote_id nullable — it's kept as a back-compat "first item"
pointer so every existing single-item view (Orders.tsx, My Orders, invoices)
keeps working unmodified; SQLite can't ALTER COLUMN to drop NOT NULL, so this
is a no-op there (SQLite doesn't enforce NOT NULL retroactively via ALTER
anyway) — recorded here for documentation and for Postgres deployments.

Run once:  python3 migrate_v14_order_items.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            quote_id INTEGER NOT NULL REFERENCES quotes(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items (order_id)")

    # Backfill: every existing order already has exactly one quote — give it
    # a matching order_items row so old orders render identically through the
    # new order.items-based views.
    cur.execute("""
        INSERT INTO order_items (order_id, quote_id)
        SELECT o.id, o.quote_id FROM orders o
        WHERE o.quote_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
    """)

    conn.commit()
    conn.close()
    print("Migration v14 complete: order_items table ready, legacy orders backfilled.")


if __name__ == "__main__":
    run()
