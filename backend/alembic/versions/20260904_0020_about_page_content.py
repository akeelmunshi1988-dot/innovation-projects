"""Add structured, admin-managed content for the public About Us page."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0020"
down_revision = "20260904_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("about_page", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "about_page")
