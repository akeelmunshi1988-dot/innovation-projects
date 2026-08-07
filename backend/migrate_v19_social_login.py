"""
Migration v19: Social login (Google / Facebook / LinkedIn) for customer accounts.

Adds:
  customers.oauth_provider — 'google' | 'facebook' | 'linkedin', null for
    password-based or guest-checkout-only accounts.
  customers.oauth_id — the provider's unique user id, for accounts created or
    linked via social login.

Run once:  python3 migrate_v19_social_login.py
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

    if not column_exists(cur, "customers", "oauth_provider"):
        cur.execute("ALTER TABLE customers ADD COLUMN oauth_provider VARCHAR(20)")
        print("  Added customers.oauth_provider")
    else:
        print("  Skipped customers.oauth_provider (already exists)")

    if not column_exists(cur, "customers", "oauth_id"):
        cur.execute("ALTER TABLE customers ADD COLUMN oauth_id VARCHAR(200)")
        print("  Added customers.oauth_id")
    else:
        print("  Skipped customers.oauth_id (already exists)")

    conn.commit()
    conn.close()
    print("Migration v19 complete.")


if __name__ == "__main__":
    run()
