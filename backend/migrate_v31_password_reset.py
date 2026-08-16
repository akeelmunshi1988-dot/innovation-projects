"""
Migration v31: Forgot/reset password.

Adds:
  staff_users.reset_token               (VARCHAR(100), nullable)
  staff_users.reset_token_expires_at    (DATETIME, nullable)
  customers.reset_token                 (VARCHAR(100), nullable)
  customers.reset_token_expires_at      (DATETIME, nullable)

Run once:  python3 migrate_v31_password_reset.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include these columns)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for table in ("staff_users", "customers"):
        for column, coltype in (("reset_token", "VARCHAR(100)"), ("reset_token_expires_at", "DATETIME")):
            if not column_exists(cur, table, column):
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")
                print(f"  + Added column: {table}.{column}")
            else:
                print(f"  . Already exists: {table}.{column}")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
