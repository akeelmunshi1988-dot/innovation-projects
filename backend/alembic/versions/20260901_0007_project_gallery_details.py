"""Add project gallery detail fields and multi-image support."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_0007"
down_revision = "20260901_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_gallery_items", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("project_gallery_items", sa.Column("owner_name", sa.String(length=150), nullable=True))
    op.add_column("project_gallery_items", sa.Column("owner_message", sa.Text(), nullable=True))
    op.add_column("project_gallery_items", sa.Column("rating", sa.Integer(), nullable=True))
    op.create_table(
        "project_gallery_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_gallery_item_id", sa.Integer(), sa.ForeignKey("project_gallery_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_url", sa.String(length=300), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_project_gallery_images_item_id", "project_gallery_images", ["project_gallery_item_id"])


def downgrade() -> None:
    op.drop_table("project_gallery_images")
    op.drop_column("project_gallery_items", "rating")
    op.drop_column("project_gallery_items", "owner_message")
    op.drop_column("project_gallery_items", "owner_name")
    op.drop_column("project_gallery_items", "description")
