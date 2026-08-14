"""
Migration v29: Homepage hero background image.

Adds:
  tenants.hero_image_url  (TEXT, nullable) — admin-uploadable storefront homepage
                           hero background, shown behind the "Handcrafted Rugs.
                           Made for Timeless Spaces." headline. Falls back to a
                           curated default image when unset.

Run once:  python3 migrate_v29_hero_image.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include this column)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not column_exists(cur, "tenants", "hero_image_url"):
        cur.execute("ALTER TABLE tenants ADD COLUMN hero_image_url VARCHAR(500)")
        print("  + Added column: hero_image_url")
    else:
        print("  . Already exists: hero_image_url")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
