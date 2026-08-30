"""One-time, lossless copy from the legacy SQLite DB to an empty PostgreSQL DB.

The destination schema is created from the current SQLAlchemy models. Explicit
primary keys are preserved and PostgreSQL sequences are reset afterward.

Usage:
    POSTGRES_DATABASE_URL='postgresql+psycopg://...' \
      python migrate_sqlite_to_postgres.py
"""

import os
from sqlalchemy import create_engine, func, insert, select, text

from app.core.database import Base
from app.models import models  # noqa: F401


SOURCE_URL = os.getenv("SQLITE_SOURCE_URL", "sqlite:///./rug_manufacture.db")
TARGET_URL = os.getenv("POSTGRES_DATABASE_URL")


def run() -> None:
    if not TARGET_URL or not TARGET_URL.startswith("postgresql"):
        raise RuntimeError("Set POSTGRES_DATABASE_URL to the destination PostgreSQL URL")
    if not SOURCE_URL.startswith("sqlite:"):
        raise RuntimeError("SQLITE_SOURCE_URL must point to the legacy SQLite database")

    source = create_engine(SOURCE_URL)
    target = create_engine(TARGET_URL, pool_pre_ping=True)
    Base.metadata.create_all(target)

    with source.connect() as source_conn, target.begin() as target_conn:
        populated = []
        for table in Base.metadata.sorted_tables:
            existing = target_conn.execute(select(func.count()).select_from(table)).scalar_one()
            if existing:
                populated.append(f"{table.name} ({existing})")
        if populated:
            raise RuntimeError("Destination must be empty; populated tables: " + ", ".join(populated))

        for table in Base.metadata.sorted_tables:
            rows = [dict(row) for row in source_conn.execute(select(table)).mappings()]
            if rows:
                target_conn.execute(insert(table), rows)
            print(f"  + {table.name}: {len(rows)} row(s)")

        # Explicit IDs were imported, so advance every serial/identity sequence.
        for table in Base.metadata.sorted_tables:
            for column in table.primary_key.columns:
                if not hasattr(column.type, "python_type") or column.type.python_type is not int:
                    continue
                sequence = target_conn.execute(
                    text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
                    {"table_name": table.name, "column_name": column.name},
                ).scalar_one_or_none()
                if sequence:
                    maximum = target_conn.execute(select(func.max(column))).scalar_one() or 0
                    target_conn.execute(
                        text("SELECT setval(CAST(:sequence AS regclass), :value, :called)"),
                        {"sequence": sequence, "value": max(maximum, 1), "called": maximum > 0},
                    )

    print("Migration complete. Source SQLite database was not modified.")


if __name__ == "__main__":
    run()
