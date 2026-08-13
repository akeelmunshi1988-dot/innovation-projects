"""
Migration v23: Automatic exchange rate refresh.

Adds:
  tenants.exchange_rates_auto        (INTEGER default 1) — when true, exchange_rates
    is kept in sync with live FX rates (fetched from open.er-api.com) instead of
    being managed manually in Business Settings.
  tenants.exchange_rates_updated_at  (DATETIME, nullable) — when exchange_rates was
    last refreshed, whether by the automatic background job or a manual edit.

Run once:  python3 migrate_v23_auto_exchange_rates.py
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

    migrations = [
        ("tenants", "exchange_rates_auto", "INTEGER DEFAULT 1"),
        ("tenants", "exchange_rates_updated_at", "TIMESTAMP"),
    ]
    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            print(f"  Added {table}.{col}")
        else:
            print(f"  Skipped {table}.{col} (already exists)")

    cur.execute("UPDATE tenants SET exchange_rates_auto = 1 WHERE exchange_rates_auto IS NULL")

    conn.commit()
    conn.close()
    print("Migration v23 complete.")


if __name__ == "__main__":
    run()
