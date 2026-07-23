"""
Seed the homepage showcase videos (hero rotation + "Behind the Craft" grid).

Unlike seed_data.py, this only touches the showcase_videos table and is safe
to run repeatedly — it skips any video_url that's already present, so it
won't duplicate rows on a second run or clobber videos added later through
the admin panel.

Requires the actual video/poster files to already be in place under
backend/static/showcase/ (synced as part of the normal backend rsync).

Run once:  python3 seed_showcase_videos.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")

VIDEOS = [
    {
        "title": "Traditional Moroccan Weave",
        "description": "Patchwork color and pattern, woven the way it has been for generations",
        "video_url": "/static/showcase/rug-moroccan-weaving-process.mp4",
        "poster_url": "/static/showcase/rug-moroccan-weaving-process-poster.jpg",
        "sort_order": -1,
        "is_intro": 1,
    },
    {
        "title": "Color on the Loom",
        "description": "Every thread hand-picked for a rug that never fades quietly into the background",
        "video_url": "/static/showcase/rug-colorful-loom-weaving.mp4",
        "poster_url": "/static/showcase/rug-colorful-loom-weaving-poster.jpg",
        "sort_order": 0,
        "is_intro": 1,
    },
    {
        "title": "Threading the Loom",
        "description": "Warp threads set by hand before a single knot is tied",
        "video_url": "/static/showcase/rug-weaving-thread-loom.mp4",
        "poster_url": "/static/showcase/rug-weaving-thread-loom-poster.jpg",
        "sort_order": 1,
        "is_intro": 0,
    },
    {
        "title": "Hand-Knotted, Thread by Thread",
        "description": "Traditional knotting technique passed down through generations",
        "video_url": "/static/showcase/rug-traditional-loom-hands.mp4",
        "poster_url": "/static/showcase/rug-traditional-loom-hands-poster.jpg",
        "sort_order": 2,
        "is_intro": 0,
    },
    {
        "title": "The Finer Details",
        "description": "Close-up craftsmanship on every pass of the shuttle",
        "video_url": "/static/showcase/rug-tapestry-loom-closeup.mp4",
        "poster_url": "/static/showcase/rug-tapestry-loom-closeup-poster.jpg",
        "sort_order": 3,
        "is_intro": 0,
    },
]


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for v in VIDEOS:
        cur.execute("SELECT id FROM showcase_videos WHERE video_url = ?", (v["video_url"],))
        if cur.fetchone():
            print(f"  Skipped {v['title']!r} (video_url already present)")
            continue
        cur.execute(
            """
            INSERT INTO showcase_videos
                (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
            VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)
            """,
            (v["title"], v["description"], v["video_url"], v["poster_url"], v["sort_order"], v["is_intro"]),
        )
        print(f"  Added {v['title']!r}")

    conn.commit()
    conn.close()
    print("Showcase video seed complete.")


if __name__ == "__main__":
    run()
