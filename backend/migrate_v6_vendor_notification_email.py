"""
Migration v6: Configurable vendor notification email.

Adds:
  tenants.vendor_notification_email  (TEXT, nullable) — where quote-request /
  review-request emails go; falls back to SMTP_FROM_EMAIL when unset.

Run once:  python3 migrate_v6_vendor_notification_email.py
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

    if not column_exists(cur, "tenants", "vendor_notification_email"):
        cur.execute("ALTER TABLE tenants ADD COLUMN vendor_notification_email TEXT")
        print("  Added tenants.vendor_notification_email")
    else:
        print("  Skipped tenants.vendor_notification_email (already exists)")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
