"""
Migration v36: Public API clients.

Adds:
  api_clients                     (new table) — partner/integration credentials
                                    for the public API (app/api/routes/public_api.py).
                                    Auth is a single opaque key sent as X-Api-Key;
                                    only its SHA-256 hash is ever stored.

Run once:  python3 migrate_v36_api_clients.py
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

    if not table_exists(cur, "api_clients"):
        cur.execute("""
            CREATE TABLE api_clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id),
                name VARCHAR(150) NOT NULL,
                key_hash VARCHAR(64) NOT NULL UNIQUE,
                key_prefix VARCHAR(16) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used_at DATETIME,
                revoked_at DATETIME
            )
        """)
        cur.execute("CREATE INDEX ix_api_clients_tenant ON api_clients (tenant_id)")
        cur.execute("CREATE UNIQUE INDEX ix_api_clients_key_hash ON api_clients (key_hash)")
        print("  + Created table: api_clients")
    else:
        print("  . Already exists: api_clients")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
