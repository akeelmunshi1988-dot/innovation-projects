"""
Migration v15: Request a Custom Rug.

Adds to `quotes` — customer-submitted bespoke design briefs (no catalog rug
attached) become a regular Quote row, priced and sent through the existing
vendor Adjust Price / Send to Customer flow (backend/app/api/routes/quotes.py).

  quotes.is_custom_request     (INTEGER default 0) — flags a customer-submitted brief
  quotes.room_type             (TEXT, nullable)     — intended room/purpose
  quotes.material_preference   (TEXT, nullable)     — "wool"|"silk"|"cotton"|"synthetic"|"no_preference"
  quotes.budget_range           (TEXT, nullable)     — preset band, e.g. "Rs.50,000-1,00,000"
  quotes.reference_image_urls  (TEXT/JSON, nullable) — list[str], up to 3 inspiration images

Run once:  python3 migrate_v15_custom_rug_requests.py
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
        ("quotes", "is_custom_request",    "INTEGER DEFAULT 0"),
        ("quotes", "room_type",            "TEXT"),
        ("quotes", "material_preference",  "TEXT"),
        ("quotes", "budget_range",         "TEXT"),
        ("quotes", "reference_image_urls", "TEXT"),
    ]
    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    cur.execute("UPDATE quotes SET is_custom_request = 0 WHERE is_custom_request IS NULL")

    conn.commit()
    conn.close()
    print("Migration v15 complete.")


if __name__ == "__main__":
    run()
