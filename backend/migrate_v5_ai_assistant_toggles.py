"""
Migration v5: AI assistant visibility toggles.

Adds:
  tenants.ai_assistant_customer_enabled  (INTEGER default 1) — show AI chat widget to shoppers
  tenants.ai_assistant_vendor_enabled    (INTEGER default 1) — show AI Assistant page to staff/admin

Run once:  python3 migrate_v5_ai_assistant_toggles.py
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
        ("tenants", "ai_assistant_customer_enabled", "INTEGER DEFAULT 1"),
        ("tenants", "ai_assistant_vendor_enabled",   "INTEGER DEFAULT 1"),
    ]

    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    cur.execute("UPDATE tenants SET ai_assistant_customer_enabled = 1 WHERE ai_assistant_customer_enabled IS NULL")
    cur.execute("UPDATE tenants SET ai_assistant_vendor_enabled = 1 WHERE ai_assistant_vendor_enabled IS NULL")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
