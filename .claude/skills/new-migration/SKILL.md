---
name: new-migration
description: Scaffold a new backend/migrate_v##_description.py SQLite migration script following this project's exact idempotent convention. Use whenever a model change needs a new column/table/index, or when asked to "add a migration" / "write a migration for X".
---

# New migration

This project has no ORM migration framework — every schema change is a plain,
hand-written, idempotent Python script under `backend/`, following one exact
shape (34 examples already exist: `backend/migrate_v2_*.py` through
`backend/migrate_v34_*.py`). Don't deviate from it.

## Steps

1. **Find the next version number.** Run:
   ```bash
   ls backend/migrate_v*.py | sed -E 's/.*migrate_v([0-9]+)_.*/\1/' | sort -n | tail -1
   ```
   The new file is `backend/migrate_v{next}_{short_description}.py`.

2. **Write the file** using this exact template — copy the structure, not just
   the idea:

   ```python
   """
   Migration v{N}: {One-line summary}.

   Adds:
     {table}.{column}   ({SQL_TYPE}, default {X}) — {why this exists, in plain
                          language, one line if it fits}

   Run once:  python3 migrate_v{N}_{short_description}.py
   """
   import sqlite3
   import os

   DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


   def column_exists(cursor, table: str, column: str) -> bool:
       cursor.execute(f"PRAGMA table_info({table})")
       return any(row[1] == column for row in cursor.fetchall())


   def table_exists(cursor, table: str) -> bool:
       cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
       return cursor.fetchone() is not None


   def run():
       if not os.path.exists(DB_PATH):
           print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include this)")
           return

       conn = sqlite3.connect(DB_PATH)
       cur = conn.cursor()

       if not column_exists(cur, "{table}", "{column}"):
           cur.execute("ALTER TABLE {table} ADD COLUMN {column} {SQL_TYPE} DEFAULT {default}")
           print("  + Added column: {table}.{column}")
       else:
           print("  . Already exists: {table}.{column}")

       conn.commit()
       conn.close()
       print("Migration complete.")


   if __name__ == "__main__":
       run()
   ```

   For a new table instead of a column, mirror `backend/migrate_v32_payment_recovery.py`'s
   `table_exists()` + `CREATE TABLE` branch — same print-message convention
   (`  + Created table: X` / `  . Already exists: X`).

3. **Update `backend/app/models/models.py`** (and `backend/app/schemas/schemas.py`
   if the field should be API-visible) to match — the migration and the model
   must agree, or queries will throw `OperationalError: no such column` in
   production (this has happened for real — see `CLAUDE.md`'s note on
   deploy = code + migrations as two separate steps).

4. **Run it locally against the real dev DB** and confirm the printed output —
   `+ Added` on first run, `. Already exists` on a second run (proves
   idempotency):
   ```bash
   cd backend && source venv/bin/activate && python3 migrate_v{N}_{short_description}.py && python3 migrate_v{N}_{short_description}.py
   ```

5. **Never edit a migration that's already been committed/deployed.** If a
   later change is needed, write a new migration on top of it — the whole
   safety property of this system depends on every already-shipped script
   staying exactly as it ran in production.

6. Mention in the PR/commit message that this migration needs to be run on
   the server after deploy (deploys don't run migrations automatically here —
   see `DEPLOYMENT.md`).
