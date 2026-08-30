"""Migration v44: add finished-product inventory to catalog rugs."""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run() -> None:
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate")
        return
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    columns = {row[1] for row in cursor.execute("PRAGMA table_info(rug_catalog)")}
    if "inventory_quantity" not in columns:
        cursor.execute("ALTER TABLE rug_catalog ADD COLUMN inventory_quantity INTEGER")
        print("  + Added rug_catalog.inventory_quantity")
    else:
        print("  . Already exists rug_catalog.inventory_quantity")
    connection.commit()
    connection.close()


if __name__ == "__main__":
    run()
