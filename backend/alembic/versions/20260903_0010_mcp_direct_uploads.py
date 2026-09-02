"""Add one-time grants for direct MCP catalog-image uploads."""

from alembic import op
import sqlalchemy as sa

revision = "20260903_0010"
down_revision = "20260902_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mcp_catalog_upload_grants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_mcp_catalog_upload_grants_token_hash", "mcp_catalog_upload_grants", ["token_hash"], unique=True)
    op.create_index("ix_mcp_catalog_upload_grants_tenant_id", "mcp_catalog_upload_grants", ["tenant_id"])
    op.create_index("ix_mcp_catalog_upload_grants_expires_at", "mcp_catalog_upload_grants", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_mcp_catalog_upload_grants_expires_at", table_name="mcp_catalog_upload_grants")
    op.drop_index("ix_mcp_catalog_upload_grants_tenant_id", table_name="mcp_catalog_upload_grants")
    op.drop_index("ix_mcp_catalog_upload_grants_token_hash", table_name="mcp_catalog_upload_grants")
    op.drop_table("mcp_catalog_upload_grants")
