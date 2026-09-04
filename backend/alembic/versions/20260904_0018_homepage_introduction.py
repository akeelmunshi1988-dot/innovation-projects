"""Add editable homepage introduction content."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0018"
down_revision = "20260904_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("homepage_intro_title_line_one", sa.String(length=100), nullable=True))
    op.add_column("tenants", sa.Column("homepage_intro_title_line_two", sa.String(length=100), nullable=True))
    op.add_column("tenants", sa.Column("homepage_intro_label", sa.String(length=100), nullable=True))
    op.add_column("tenants", sa.Column("homepage_intro_description", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("homepage_intro_cta_label", sa.String(length=60), nullable=True))
    op.add_column("tenants", sa.Column("homepage_intro_cta_url", sa.String(length=300), nullable=True))
    op.add_column("tenants", sa.Column("homepage_intro_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("tenants", "homepage_intro_enabled")
    op.drop_column("tenants", "homepage_intro_cta_url")
    op.drop_column("tenants", "homepage_intro_cta_label")
    op.drop_column("tenants", "homepage_intro_description")
    op.drop_column("tenants", "homepage_intro_label")
    op.drop_column("tenants", "homepage_intro_title_line_two")
    op.drop_column("tenants", "homepage_intro_title_line_one")
