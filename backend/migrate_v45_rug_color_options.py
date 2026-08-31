"""Migration v45: add catalog colorways and selected order color snapshots."""

import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")


def run() -> None:
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH} — nothing to migrate")
        return
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    rug_columns = {row[1] for row in cursor.execute("PRAGMA table_info(rug_catalog)")}
    if "color_options" not in rug_columns:
        cursor.execute("ALTER TABLE rug_catalog ADD COLUMN color_options JSON")
        print("  + Added rug_catalog.color_options")
    else:
        print("  . Already exists rug_catalog.color_options")

    quote_columns = {row[1] for row in cursor.execute("PRAGMA table_info(quotes)")}
    if "selected_color" not in quote_columns:
        cursor.execute("ALTER TABLE quotes ADD COLUMN selected_color VARCHAR(100)")
        print("  + Added quotes.selected_color")
    else:
        print("  . Already exists quotes.selected_color")

    connection.commit()
    connection.close()


if __name__ == "__main__":
    run()
