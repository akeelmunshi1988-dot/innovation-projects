"""
Migration v37: AI chat message history.

Adds:
  ai_chat_messages                (new table) — persists every turn of the
                                    vendor AI Assistant conversation (user
                                    prompts + assistant replies) for future
                                    reference/audit. See app/services/ai_agent.py
                                    and app/api/routes/chat.py.

Run once:  python3 migrate_v37_ai_chat_messages.py
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

    if not table_exists(cur, "ai_chat_messages"):
        cur.execute("""
            CREATE TABLE ai_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id),
                session_id VARCHAR(100),
                staff_id INTEGER REFERENCES staff_users(id),
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX ix_ai_chat_messages_tenant_session ON ai_chat_messages (tenant_id, session_id, created_at)")
        print("  + Created table: ai_chat_messages")
    else:
        print("  . Already exists: ai_chat_messages")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
