"""
Migration v30: Slug-based catalog URLs.

Adds:
  rug_catalog.slug  (VARCHAR(220), nullable, indexed) — URL-friendly identifier
                     used for /catalog/<slug> instead of the numeric id, unique
                     per tenant. Backfilled for existing rows from `name`
                     (deduplicated with a -2, -3, ... suffix on collision).

Run once:  python3 migrate_v30_rug_slug.py
"""
import os
import re
import sqlite3
import unicodedata

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def index_exists(cursor, index_name: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name=?", (index_name,))
    return cursor.fetchone() is not None


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "rug"


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will include this column)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not column_exists(cur, "rug_catalog", "slug"):
        cur.execute("ALTER TABLE rug_catalog ADD COLUMN slug VARCHAR(220)")
        print("  + Added column: slug")
    else:
        print("  . Already exists: slug")

    cur.execute("SELECT id, name, tenant_id, slug FROM rug_catalog")
    rows = cur.fetchall()
    taken = {}  # (tenant_id, slug) -> True, seeded with already-set slugs
    for rug_id, name, tenant_id, slug in rows:
        if slug:
            taken[(tenant_id, slug)] = True

    backfilled = 0
    for rug_id, name, tenant_id, slug in rows:
        if slug:
            continue
        base = slugify(name)
        candidate = base
        suffix = 2
        while (tenant_id, candidate) in taken:
            candidate = f"{base}-{suffix}"
            suffix += 1
        taken[(tenant_id, candidate)] = True
        cur.execute("UPDATE rug_catalog SET slug = ? WHERE id = ?", (candidate, rug_id))
        backfilled += 1
    print(f"  + Backfilled slug for {backfilled} existing rug(s)")

    if not index_exists(cur, "uq_rug_slug_tenant"):
        cur.execute("CREATE UNIQUE INDEX uq_rug_slug_tenant ON rug_catalog (slug, tenant_id)")
        print("  + Added unique index: uq_rug_slug_tenant")
    else:
        print("  . Already exists: uq_rug_slug_tenant")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
