"""Add OAuth 2.1 persistence for the ChatGPT MCP connector."""

from alembic import op
import sqlalchemy as sa

revision = "20260902_0008"
down_revision = "20260901_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mcp_oauth_clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.String(128), nullable=False),
        sa.Column("client_name", sa.String(200), nullable=True),
        sa.Column("redirect_uris", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_mcp_oauth_clients_client_id", "mcp_oauth_clients", ["client_id"], unique=True)
    op.create_table(
        "mcp_oauth_authorization_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transaction_hash", sa.String(64), nullable=False),
        sa.Column("client_id", sa.String(128), nullable=False),
        sa.Column("redirect_uri", sa.String(1000), nullable=False),
        sa.Column("state", sa.String(500), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("code_challenge", sa.String(128), nullable=False),
        sa.Column("resource", sa.String(1000), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_mcp_oauth_auth_requests_transaction", "mcp_oauth_authorization_requests", ["transaction_hash"], unique=True)
    op.create_index("ix_mcp_oauth_auth_requests_client", "mcp_oauth_authorization_requests", ["client_id"])
    op.create_table(
        "mcp_oauth_authorization_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("client_id", sa.String(128), nullable=False),
        sa.Column("staff_user_id", sa.Integer(), sa.ForeignKey("staff_users.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("redirect_uri", sa.String(1000), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("code_challenge", sa.String(128), nullable=False),
        sa.Column("resource", sa.String(1000), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_mcp_oauth_auth_codes_code", "mcp_oauth_authorization_codes", ["code_hash"], unique=True)
    op.create_index("ix_mcp_oauth_auth_codes_client", "mcp_oauth_authorization_codes", ["client_id"])
    op.create_table(
        "mcp_oauth_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("token_type", sa.String(10), nullable=False),
        sa.Column("client_id", sa.String(128), nullable=False),
        sa.Column("staff_user_id", sa.Integer(), sa.ForeignKey("staff_users.id"), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("resource", sa.String(1000), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_mcp_oauth_tokens_hash", "mcp_oauth_tokens", ["token_hash"], unique=True)
    op.create_index("ix_mcp_oauth_tokens_client", "mcp_oauth_tokens", ["client_id"])


def downgrade() -> None:
    op.drop_table("mcp_oauth_tokens")
    op.drop_table("mcp_oauth_authorization_codes")
    op.drop_table("mcp_oauth_authorization_requests")
    op.drop_table("mcp_oauth_clients")
