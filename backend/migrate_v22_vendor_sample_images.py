"""
Migration v22: Vendor sample images on custom rug request quotes.

Adds:
  quotes.vendor_sample_image_urls (JSON, list[str], up to 3) — design sample
    images the vendor uploads and sends back to the customer in response to
    a custom rug request (quotes.is_custom_request = True).

Run once:  python3 migrate_v22_vendor_sample_images.py
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

    if not column_exists(cur, "quotes", "vendor_sample_image_urls"):
        cur.execute("ALTER TABLE quotes ADD COLUMN vendor_sample_image_urls TEXT")
        print("  Added quotes.vendor_sample_image_urls")
    else:
        print("  Skipped quotes.vendor_sample_image_urls (already exists)")

    conn.commit()
    conn.close()
    print("Migration v22 complete.")


if __name__ == "__main__":
    run()
