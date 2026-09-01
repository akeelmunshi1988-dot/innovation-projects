"""Add managed hero carousel, policy and product FAQs."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_0003"
down_revision = "20260830_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("hero_images", sa.JSON(), nullable=True))
    op.add_column("tenants", sa.Column("refund_cancellation_policy_html", sa.Text(), nullable=True))
    op.create_table(
        "faqs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("rug_catalog_id", sa.Integer(), sa.ForeignKey("rug_catalog.id", ondelete="CASCADE"), nullable=True),
        sa.Column("question", sa.String(length=500), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_faqs_tenant_id", "faqs", ["tenant_id"])
    op.create_index("ix_faqs_rug_catalog_id", "faqs", ["rug_catalog_id"])
    op.create_index("ix_faqs_tenant_rug_active_sort", "faqs", ["tenant_id", "rug_catalog_id", "is_active", "sort_order"])


def downgrade() -> None:
    op.drop_table("faqs")
    op.drop_column("tenants", "refund_cancellation_policy_html")
    op.drop_column("tenants", "hero_images")
