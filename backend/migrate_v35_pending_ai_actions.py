"""
Migration v35: Pending AI actions.

Adds:
  pending_ai_actions              (new table) — a write the AI assistant wants
                                    to make (create/update/delete a catalog rug,
                                    material, or promo code), staged here for a
                                    human to confirm or reject before it touches
                                    real data. See app/services/ai_agent.py.

Run once:  python3 migrate_v35_pending_ai_actions.py
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

    if not table_exists(cur, "pending_ai_actions"):
        cur.execute("""
            CREATE TABLE pending_ai_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id),
                session_id VARCHAR(100),
                action_type VARCHAR(20) NOT NULL,
                entity_type VARCHAR(30) NOT NULL,
                entity_id INTEGER,
                payload JSON NOT NULL,
                summary TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_by_staff_id INTEGER REFERENCES staff_users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
            )
        """)
        cur.execute("CREATE INDEX ix_pending_ai_actions_tenant_status ON pending_ai_actions (tenant_id, status)")
        print("  + Created table: pending_ai_actions")
    else:
        print("  . Already exists: pending_ai_actions")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
