"""
Migration v39: Admin-editable rotating announcement bar messages.

Adds:
  announcement_messages       (new table) — the storefront's top announcement
                                bar rotates through these (promotions, new
                                collection callouts, etc.) instead of showing
                                one fixed line of text. See
                                app/api/routes/announcements.py and
                                app/api/routes/customer.py's public endpoint.

Run once:  python3 migrate_v39_announcement_messages.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include this)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not table_exists(cur, "announcement_messages"):
        cur.execute("""
            CREATE TABLE announcement_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER REFERENCES tenants(id),
                text VARCHAR(200) NOT NULL,
                link_url VARCHAR(300),
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  + Created table: announcement_messages")
    else:
        print("  . Already exists: announcement_messages")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
