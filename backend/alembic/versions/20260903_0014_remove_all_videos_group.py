"""Replace the generic All Videos showcase group with Craftsmanship."""

from alembic import op


revision = "20260903_0014"
down_revision = "20260903_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE showcase_videos SET tab_name = 'Craftsmanship' WHERE is_intro = false AND (tab_name IS NULL OR lower(trim(tab_name)) = 'all videos')")


def downgrade() -> None:
    op.execute("UPDATE showcase_videos SET tab_name = 'All Videos' WHERE is_intro = false AND tab_name = 'Craftsmanship'")
