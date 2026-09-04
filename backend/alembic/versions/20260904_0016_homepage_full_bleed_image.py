"""Add an admin-managed homepage full-bleed image section."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0016"
down_revision = "20260903_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("homepage_full_bleed_image_url", sa.String(length=500), nullable=True))
    op.add_column("tenants", sa.Column("homepage_full_bleed_alt_text", sa.String(length=200), nullable=True))
    op.add_column("tenants", sa.Column("homepage_full_bleed_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("tenants", "homepage_full_bleed_enabled")
    op.drop_column("tenants", "homepage_full_bleed_alt_text")
    op.drop_column("tenants", "homepage_full_bleed_image_url")
