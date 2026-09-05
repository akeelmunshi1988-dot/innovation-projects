"""Add category-specific collection display images."""
from alembic import op
import sqlalchemy as sa

revision = "20260905_0023"
down_revision = "20260904_0022"
branch_labels = None
depends_on = None


def upgrade():
    if "collection_displays" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(
            "collection_displays",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
            sa.Column("category", sa.String(150), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("images", sa.JSON(), nullable=False),
            sa.UniqueConstraint("tenant_id", "category", name="uq_collection_display_tenant_category"),
        )


def downgrade():
    op.drop_table("collection_displays")
