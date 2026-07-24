"""
Migration v8: Tenant default size unit.

Adds:
  tenants.default_size_unit  (TEXT default 'ft') — display unit ("ft" or "cm")
  used to render standard rug sizes across the admin panel and storefront.

Run once:  python3 migrate_v8_default_size_unit.py
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

    if not column_exists(cur, "tenants", "default_size_unit"):
        cur.execute("ALTER TABLE tenants ADD COLUMN default_size_unit TEXT DEFAULT 'ft'")
        print("  Added tenants.default_size_unit")
    else:
        print("  Skipped tenants.default_size_unit (already exists)")

    cur.execute("UPDATE tenants SET default_size_unit = 'ft' WHERE default_size_unit IS NULL")

    conn.commit()
    conn.close()
    print("Migration v8 complete.")


if __name__ == "__main__":
    run()
