"""
Migration v34: Vendor-entered cm on catalog sizes.

RugCatalog.sizes changes shape from a list of plain feet strings
(e.g. ["2x3", "4x6"]) to a list of objects (e.g.
[{"ft": "2x3", "cm": null}, {"ft": "4x6", "cm": null}]).

`cm` starts out null for every existing size — deliberately NOT backfilled with
a computed ft->cm conversion. The whole point of this change is that cm is a
vendor-typed value going forward, never calculated; existing rugs simply won't
show a cm size until a vendor opens them in the admin catalog and fills it in.

Idempotent — rows already in the new object shape are left untouched, so it's
safe to run again.

Run once:  python3 migrate_v34_catalog_size_cm.py
"""
import json
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run():
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate (fresh DB will use the new shape)")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    rows = cur.execute("SELECT id, sizes FROM rug_catalog").fetchall()
    updated = 0
    skipped = 0
    for rug_id, sizes_json in rows:
        sizes = json.loads(sizes_json) if sizes_json else []
        if sizes and isinstance(sizes[0], dict):
            skipped += 1
            continue  # already migrated
        new_sizes = [{"ft": s, "cm": None} for s in sizes]
        cur.execute("UPDATE rug_catalog SET sizes = ? WHERE id = ?", (json.dumps(new_sizes), rug_id))
        updated += 1

    conn.commit()
    conn.close()
    print(f"  + Migrated {updated} rug(s) to the new sizes shape")
    print(f"  . Skipped {skipped} rug(s) already migrated")
    print("Migration complete.")


if __name__ == "__main__":
    run()
