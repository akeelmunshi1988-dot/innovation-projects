"""
Migration v11: Refresh tokens table.

Adds the `refresh_tokens` table backing the new rotate-on-use refresh token
flow (see app/core/auth.py: create_refresh_token / rotate_refresh_token).
Access tokens are now short-lived (JWT_EXPIRE_MINUTES default dropped from
7 days to 30 minutes) — the refresh token, delivered as an httpOnly cookie,
is what lets a session silently renew without forcing re-login.

Run once:  python3 migrate_v11_refresh_tokens.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type VARCHAR(10) NOT NULL,
            user_id INTEGER NOT NULL,
            token_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            revoked_at DATETIME,
            replaced_by_id INTEGER REFERENCES refresh_tokens(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens (token_hash)")

    conn.commit()
    conn.close()
    print("Migration v11 complete: refresh_tokens table ready.")


if __name__ == "__main__":
    run()
