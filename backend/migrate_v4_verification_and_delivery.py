"""
Migration v4: Email verification + editable expected delivery.

Adds:
  customers.is_verified                    (INTEGER default 0)
  customers.verification_token             (TEXT, nullable)
  customers.verification_token_expires_at  (TEXT, nullable — ISO datetime)
  quotes.expected_delivery_days            (INTEGER, nullable)

Backfills is_verified=1 for customers who already have a password set today,
so existing self-registered accounts aren't locked out by the new login gate.

Run once:  python3 migrate_v4_verification_and_delivery.py
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
        ("customers", "is_verified",                    "INTEGER DEFAULT 0"),
        ("customers", "verification_token",             "TEXT"),
        ("customers", "verification_token_expires_at",  "TEXT"),
        ("quotes",    "expected_delivery_days",          "INTEGER"),
    ]

    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    # Backfill: customers who already have a password are already logging in today — don't retroactively lock them out
    cur.execute("UPDATE customers SET is_verified = 1 WHERE hashed_password IS NOT NULL")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
