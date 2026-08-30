"""PostgreSQL baseline after legacy SQLite import."""

revision = "20260830_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The initial schema and data are created by migrate_sqlite_to_postgres.py.
    pass


def downgrade() -> None:
    # Never drop a production baseline schema automatically.
    pass
