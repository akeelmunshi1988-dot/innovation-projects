"""Add admin-managed tabs to See It Made showcase videos."""

from alembic import op
import sqlalchemy as sa


revision = "20260903_0013"
down_revision = "20260903_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("showcase_videos", sa.Column("tab_name", sa.String(length=100), nullable=True))
    op.execute("UPDATE showcase_videos SET tab_name = 'All Videos' WHERE is_intro = false")


def downgrade() -> None:
    op.drop_column("showcase_videos", "tab_name")
