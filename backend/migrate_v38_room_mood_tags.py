"""
Migration v38: Room-type + mood tags on the catalog ("Shop by Space" / "Shop by Mood").

Adds:
  rug_catalog.room_types  (JSON, nullable) — list[str], e.g. ["living_room", "bedroom"]
  rug_catalog.mood_tags   (JSON, nullable) — list[str], e.g. ["warm_earthy", "quiet_luxury"]

Both start out NULL for existing rugs — an admin assigns them going forward via
the catalog form. See app/models/models.py's RugCatalog.

Run once:  python3 migrate_v38_room_mood_tags.py
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

    if not column_exists(cur, "rug_catalog", "room_types"):
        cur.execute("ALTER TABLE rug_catalog ADD COLUMN room_types JSON")
        print("  + Added column: room_types")
    else:
        print("  . Already exists: room_types")

    if not column_exists(cur, "rug_catalog", "mood_tags"):
        cur.execute("ALTER TABLE rug_catalog ADD COLUMN mood_tags JSON")
        print("  + Added column: mood_tags")
    else:
        print("  . Already exists: mood_tags")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run()
