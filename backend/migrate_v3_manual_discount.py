"""Add manual_discount_pct to quotes table."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")

COLUMNS = [
    ("quotes", "manual_discount_pct", "REAL"),
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

for table, column, col_type in COLUMNS:
    cur.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in cur.fetchall()}
    if column not in existing:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        print(f"Added {table}.{column}")
    else:
        print(f"Skipped {table}.{column} (already exists)")

conn.commit()
conn.close()
print("Done.")
