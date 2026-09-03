"""Add editable About Us content to tenant settings."""

from alembic import op
import sqlalchemy as sa


revision = "20260903_0015"
down_revision = "20260903_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("about_us_content_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "about_us_content_html")
