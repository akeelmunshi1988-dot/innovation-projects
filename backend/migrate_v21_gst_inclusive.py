"""
Migration v21: GST-inclusive pricing toggle.

Adds:
  tenants.gst_inclusive (INTEGER default 0) — on/off switch for GST on
    quotes/orders. False: no GST is calculated at all. True: the selling
    price computed by the quote engine already includes GST (tax is backed
    out of it for the invoice breakdown) rather than added on top.

Run once:  python3 migrate_v21_gst_inclusive.py
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

    if not column_exists(cur, "tenants", "gst_inclusive"):
        cur.execute("ALTER TABLE tenants ADD COLUMN gst_inclusive INTEGER DEFAULT 0")
        cur.execute("UPDATE tenants SET gst_inclusive = 0 WHERE gst_inclusive IS NULL")
        print("  Added tenants.gst_inclusive")
    else:
        print("  Skipped tenants.gst_inclusive (already exists)")

    conn.commit()
    conn.close()
    print("Migration v21 complete.")


if __name__ == "__main__":
    run()
