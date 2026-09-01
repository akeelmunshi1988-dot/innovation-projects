"""Add admin-managed privacy policy content."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_0004"
down_revision = "20260901_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("privacy_policy_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "privacy_policy_html")
