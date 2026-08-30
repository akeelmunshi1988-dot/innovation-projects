"""Migration v41: add a vendor-entered total price to every catalog size.

Existing sizes receive the rug's former base_price so deployed catalogs remain
orderable. Vendors can then replace those seeded values per size in Admin.

Idempotent. Run once from the backend directory:
    python3 migrate_v41_catalog_size_prices.py
"""

import json
import os
import sqlite3


DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run() -> None:
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate")
        return

    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    rows = cursor.execute("SELECT id, sizes, base_price FROM rug_catalog").fetchall()
    updated = 0
    for rug_id, sizes_json, former_price in rows:
        sizes = json.loads(sizes_json) if sizes_json else []
        changed = False
        normalized = []
        for index, size in enumerate(sizes):
            item = dict(size) if isinstance(size, dict) else {"ft": str(size), "cm": None}
            if item.get("price") is None:
                item["price"] = float(former_price or 0)
                changed = True
            if "is_default" not in item:
                item["is_default"] = index == 0
                changed = True
            normalized.append(item)
        if changed:
            cursor.execute("UPDATE rug_catalog SET sizes = ? WHERE id = ?", (json.dumps(normalized), rug_id))
            updated += 1

    connection.commit()
    connection.close()
    print(f"Migrated size prices for {updated} rug(s)")


if __name__ == "__main__":
    run()
