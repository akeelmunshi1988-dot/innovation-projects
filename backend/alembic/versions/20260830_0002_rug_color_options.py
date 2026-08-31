"""Add rug color options and selected color snapshots."""

from alembic import op
import sqlalchemy as sa

revision = "20260830_0002"
down_revision = "20260830_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rug_catalog", sa.Column("color_options", sa.JSON(), nullable=True))
    op.add_column("quotes", sa.Column("selected_color", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("quotes", "selected_color")
    op.drop_column("rug_catalog", "color_options")
