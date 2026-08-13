"""
Migration v25: Quote revision tracking + order price snapshot.

Adds:
  quotes.revised_from_quote_id (INTEGER, nullable, FK -> quotes.id) — set when
    this quote was cloned from a rejected one via "Revise & Resend", instead of
    reopening/mutating the rejected quote in place.
  orders.total_amount   (REAL, nullable) — sum of every line item's final_price
    + shipping - discount, frozen at order-creation time. The source of truth
    for what was agreed/paid (e.g. for refunds), independent of the linked
    quote(s) ever changing later.
  orders.price_currency (TEXT, nullable) — currency total_amount is in.

Run once:  python3 migrate_v25_quote_revisions_order_snapshot.py
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
        ("quotes", "revised_from_quote_id", "INTEGER"),
        ("orders", "total_amount", "REAL"),
        ("orders", "price_currency", "TEXT"),
    ]
    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    conn.commit()
    conn.close()
    print("Migration v25 complete.")


if __name__ == "__main__":
    run()
