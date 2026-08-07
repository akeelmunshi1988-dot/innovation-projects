"""
Migration v13: International homepage features.

Adds:
  testimonials             (new table) — international buyer quotes for the homepage
  project_gallery_items    (new table) — admin-curated "Project Gallery" images
  newsletter_subscribers   (new table) — footer newsletter capture, admin-export only
  customers.account_type   (TEXT default 'retail') — "retail" | "trade" (architects/hotels/retailers)
  tenants.catalog_pdf_url  (TEXT, nullable) — downloadable lookbook/catalog PDF
  tenants.certifications   (TEXT/JSON, nullable) — list[{"label","image_url"}] footer badges

Run once:  python3 migrate_v13_homepage_features.py
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

    cur.execute("""
        CREATE TABLE IF NOT EXISTS testimonials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER REFERENCES tenants(id),
            author_name VARCHAR(150) NOT NULL,
            author_title VARCHAR(150),
            country VARCHAR(100),
            quote TEXT NOT NULL,
            photo_url VARCHAR(300),
            rating INTEGER,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS project_gallery_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER REFERENCES tenants(id),
            image_url VARCHAR(300) NOT NULL,
            caption VARCHAR(150),
            link_url VARCHAR(300),
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER REFERENCES tenants(id),
            email VARCHAR(200) NOT NULL,
            source VARCHAR(50),
            subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email, tenant_id)
        )
    """)

    migrations = [
        ("customers", "account_type",    "TEXT DEFAULT 'retail'"),
        ("tenants",   "catalog_pdf_url", "TEXT"),
        ("tenants",   "certifications",  "TEXT"),
    ]
    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    cur.execute("UPDATE customers SET account_type = 'retail' WHERE account_type IS NULL")

    conn.commit()
    conn.close()
    print("Migration v13 complete.")


if __name__ == "__main__":
    run()
