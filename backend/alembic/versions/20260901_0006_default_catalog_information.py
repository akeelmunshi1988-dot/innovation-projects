"""Add tenant-wide default additional catalog information."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_0006"
down_revision = "20260901_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("default_catalog_additional_information_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "default_catalog_additional_information_html")
