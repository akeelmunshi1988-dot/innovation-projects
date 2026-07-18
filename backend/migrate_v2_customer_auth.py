"""
Migration v2: Customer authentication + quote lifecycle fields.

Adds:
  customers.hashed_password  (TEXT, nullable)
  customers.is_active        (INTEGER default 1)
  quotes.vendor_notes        (TEXT, nullable)
  quotes.customer_response_notes (TEXT, nullable)

Run once:  python3 migrate_v2_customer_auth.py
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
        ("customers", "hashed_password",          "TEXT"),
        ("customers", "is_active",                "INTEGER DEFAULT 1"),
        ("quotes",    "vendor_notes",             "TEXT"),
        ("quotes",    "customer_response_notes",  "TEXT"),
    ]

    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    # Backfill is_active = 1 for existing customers
    cur.execute("UPDATE customers SET is_active = 1 WHERE is_active IS NULL")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
