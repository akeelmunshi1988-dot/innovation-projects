"""
Migration v40: Admin-editable hero section text.

Adds:
  tenants.hero_eyebrow    (VARCHAR(100), nullable) — small line above the hero
                           headline, e.g. "20+ Years in the Making". Falls back
                           to a default when unset.
  tenants.hero_heading    (VARCHAR(200), nullable) — main hero headline text.
                           Falls back to a default when unset.
  tenants.hero_cta_label  (VARCHAR(50), nullable)  — hero CTA link text (always
                           links to /catalog). Falls back to a default when unset.

Run once:  python3 migrate_v40_hero_text.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include these columns)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for column, ddl_type in [
        ("hero_eyebrow", "VARCHAR(100)"),
        ("hero_heading", "VARCHAR(200)"),
        ("hero_cta_label", "VARCHAR(50)"),
    ]:
        if not column_exists(cur, "tenants", column):
            cur.execute(f"ALTER TABLE tenants ADD COLUMN {column} {ddl_type}")
            print(f"  + Added column: {column}")
        else:
            print(f"  . Already exists: {column}")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
