"""Add shared product-detail accordion content to tenant settings."""

from alembic import op
import sqlalchemy as sa


revision = "20260903_0012"
down_revision = "20260903_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("rug_sample_information_html", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("rug_care_advice_html", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("rug_shipping_returns_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "rug_shipping_returns_html")
    op.drop_column("tenants", "rug_care_advice_html")
    op.drop_column("tenants", "rug_sample_information_html")
