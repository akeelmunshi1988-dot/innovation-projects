"""
Migration v27: Custom rug request expected delivery preference.

Adds:
  quotes.expected_delivery (TEXT, nullable) — customer's preferred delivery
    timeframe on the "Request a Custom Rug" form (e.g. "Within 4 weeks"),
    optional, shown alongside the rest of the custom request brief.

Run once:  python3 migrate_v27_quote_expected_delivery.py
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

    if not column_exists(cur, "quotes", "expected_delivery"):
        cur.execute("ALTER TABLE quotes ADD COLUMN expected_delivery TEXT")
        print("  Added quotes.expected_delivery")
    else:
        print("  Skipped quotes.expected_delivery (already exists)")

    conn.commit()
    conn.close()
    print("Migration v27 complete.")


if __name__ == "__main__":
    run()
