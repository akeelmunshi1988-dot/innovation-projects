"""Add editable homepage company-value content."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0017"
down_revision = "20260904_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("homepage_values_eyebrow", sa.String(length=100), nullable=True))
    op.add_column("tenants", sa.Column("homepage_values_headline", sa.String(length=250), nullable=True))
    op.add_column("tenants", sa.Column("homepage_values_headline_accent", sa.String(length=250), nullable=True))
    op.add_column("tenants", sa.Column("homepage_values_description", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("homepage_values_items", sa.JSON(), nullable=True))
    op.add_column("tenants", sa.Column("homepage_values_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("tenants", "homepage_values_enabled")
    op.drop_column("tenants", "homepage_values_items")
    op.drop_column("tenants", "homepage_values_description")
    op.drop_column("tenants", "homepage_values_headline_accent")
    op.drop_column("tenants", "homepage_values_headline")
    op.drop_column("tenants", "homepage_values_eyebrow")
