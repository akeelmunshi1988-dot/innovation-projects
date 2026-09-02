"""Add tenant-level catalog size master table."""

from alembic import op
import sqlalchemy as sa

revision = "20260902_0009"
down_revision = "20260902_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("enabled_currencies", sa.JSON(), nullable=True))
    op.create_table(
        "catalog_size_master",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ft", sa.String(length=50), nullable=False),
        sa.Column("cm", sa.String(length=50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("tenant_id", "ft", name="uq_catalog_size_master_tenant_ft"),
    )
    op.create_index("ix_catalog_size_master_id", "catalog_size_master", ["id"])
    op.create_index("ix_catalog_size_master_tenant_id", "catalog_size_master", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_catalog_size_master_tenant_id", table_name="catalog_size_master")
    op.drop_index("ix_catalog_size_master_id", table_name="catalog_size_master")
    op.drop_table("catalog_size_master")
    op.drop_column("tenants", "enabled_currencies")
