"""Add admin-editable content for the public Colour Matching page."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0029"
down_revision = "20260906_0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tenant_columns = {column["name"] for column in inspector.get_columns("tenants")}
    tenant_fields = (
        ("colour_matching_eyebrow", sa.String(length=100), True, None),
        ("colour_matching_heading", sa.String(length=200), True, None),
        ("colour_matching_body", sa.Text(), True, None),
        ("colour_matching_items", sa.JSON(), True, None),
    )
    for name, column_type, nullable, server_default in tenant_fields:
        if name not in tenant_columns:
            op.add_column("tenants", sa.Column(name, column_type, nullable=nullable, server_default=server_default))


def downgrade() -> None:
    op.drop_column("tenants", "colour_matching_items")
    op.drop_column("tenants", "colour_matching_body")
    op.drop_column("tenants", "colour_matching_heading")
    op.drop_column("tenants", "colour_matching_eyebrow")
