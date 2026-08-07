"""
Migration v16: Rug image gallery + per-rug rich-text "About this rug" content.

Adds:
  rug_images table — additional gallery images per catalog rug (rug_catalog.image_url
    stays the cover/primary image, unchanged; these are extra slides for the
    customer-facing rug detail slider).
  rug_catalog.about_content_html (TEXT, nullable) — admin-authored WYSIWYG content
    for the "About this rug" section on the catalog detail page. Falls back to the
    existing plain-text `description` column when empty.

Also drops tenants.about_content_html, added and then reverted earlier in the same
session before it shipped anywhere — this migration is the corrected version.

Run once:  python3 migrate_v16_rug_images_about.py
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
        CREATE TABLE IF NOT EXISTS rug_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rug_catalog_id INTEGER NOT NULL REFERENCES rug_catalog(id),
            image_url VARCHAR(300) NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_rug_images_rug_catalog_id ON rug_images (rug_catalog_id)")

    if not column_exists(cur, "rug_catalog", "about_content_html"):
        cur.execute("ALTER TABLE rug_catalog ADD COLUMN about_content_html TEXT")
        print("  Added rug_catalog.about_content_html")
    else:
        print("  Skipped rug_catalog.about_content_html (already exists)")

    if column_exists(cur, "tenants", "about_content_html"):
        cur.execute("ALTER TABLE tenants DROP COLUMN about_content_html")
        print("  Dropped tenants.about_content_html (superseded by rug_catalog.about_content_html)")

    conn.commit()
    conn.close()
    print("Migration v16 complete.")


if __name__ == "__main__":
    run()
