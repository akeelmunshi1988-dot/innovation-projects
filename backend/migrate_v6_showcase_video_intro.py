"""
Migration v6: Showcase video intro flag.

Adds:
  showcase_videos.is_intro  (INTEGER default 0) — marks a video as part of the
  rotating hero slot on the homepage instead of the "Behind the Craft" grid.

Run once:  python3 migrate_v6_showcase_video_intro.py
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

    if not column_exists(cur, "showcase_videos", "is_intro"):
        cur.execute("ALTER TABLE showcase_videos ADD COLUMN is_intro INTEGER DEFAULT 0")
        print("  Added showcase_videos.is_intro")
    else:
        print("  Skipped showcase_videos.is_intro (already exists)")

    cur.execute("UPDATE showcase_videos SET is_intro = 0 WHERE is_intro IS NULL")

    conn.commit()
    conn.close()
    print("Migration v6 complete.")


if __name__ == "__main__":
    run()
