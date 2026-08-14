"""
Migration v28: Multi-rug custom request grouping.

Adds:
  quotes.request_group_id (TEXT, nullable, indexed) — ties together multiple
    Quote rows submitted as one multi-rug "Request a Custom Rug" submission,
    so the vendor can see which quotes belong together and later combine
    their resulting orders via POST /orders/combine.

Run once:  python3 migrate_v28_quote_request_group.py
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

    if not column_exists(cur, "quotes", "request_group_id"):
        cur.execute("ALTER TABLE quotes ADD COLUMN request_group_id TEXT")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_quotes_request_group_id ON quotes (request_group_id)")
        print("  Added quotes.request_group_id (+ index)")
    else:
        print("  Skipped quotes.request_group_id (already exists)")

    conn.commit()
    conn.close()
    print("Migration v28 complete.")


if __name__ == "__main__":
    run()
