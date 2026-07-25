"""
Migration v10: Public contact details.

Adds:
  tenants.contact_emails   (JSON list[str], stored as TEXT)
  tenants.contact_phones   (JSON list[str], stored as TEXT)
  tenants.contact_address  (TEXT) — workshop/visiting address shown on the public
                             "About Us" page, distinct from the GST registered address
  tenants.contact_hours    (TEXT)

Run once:  python3 migrate_v10_contact_details.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")

COLUMNS = [
    ("contact_emails", "TEXT"),
    ("contact_phones", "TEXT"),
    ("contact_address", "TEXT"),
    ("contact_hours", "TEXT"),
]


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for column, coltype in COLUMNS:
        if not column_exists(cur, "tenants", column):
            cur.execute(f"ALTER TABLE tenants ADD COLUMN {column} {coltype}")
            print(f"  Added tenants.{column}")
        else:
            print(f"  Skipped tenants.{column} (already exists)")

    conn.commit()
    conn.close()
    print("Migration v10 complete.")


if __name__ == "__main__":
    run()
