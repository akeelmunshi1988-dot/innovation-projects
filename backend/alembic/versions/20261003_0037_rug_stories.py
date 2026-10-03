"""Admin-written stories behind unique rug designs, each with its own /stories/<slug> page."""

from alembic import op
import sqlalchemy as sa


revision = "20261003_0037"
down_revision = "20261002_0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rug_stories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("inspiration", sa.String(length=300), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("cover_image_url", sa.String(length=300), nullable=True),
        sa.Column("media", sa.JSON(), nullable=True),
        sa.Column("rug_id", sa.Integer(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rug_id"], ["rug_catalog.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_rug_story_slug_tenant"),
    )
    op.create_index("ix_rug_stories_id", "rug_stories", ["id"], unique=False)
    op.create_index("ix_rug_stories_tenant_published_sort", "rug_stories", ["tenant_id", "is_published", "sort_order"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_rug_stories_tenant_published_sort", table_name="rug_stories")
    op.drop_index("ix_rug_stories_id", table_name="rug_stories")
    op.drop_table("rug_stories")
