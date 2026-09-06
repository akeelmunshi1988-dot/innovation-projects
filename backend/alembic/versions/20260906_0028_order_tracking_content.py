"""Add admin-editable content for the public Order Tracking page."""

from alembic import op
import sqlalchemy as sa


revision = "20260906_0028"
down_revision = "20260905_0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tenant_columns = {column["name"] for column in inspector.get_columns("tenants")}
    tenant_fields = (
        ("order_tracking_eyebrow", sa.String(length=100), True, None),
        ("order_tracking_heading", sa.String(length=200), True, None),
        ("order_tracking_body", sa.Text(), True, None),
        ("order_tracking_shipping_policy_url", sa.String(length=500), True, None),
        ("order_tracking_carriers", sa.JSON(), True, None),
        ("order_tracking_steps", sa.JSON(), True, None),
        ("order_tracking_media_url", sa.String(length=500), True, None),
        ("order_tracking_media_type", sa.String(length=10), True, None),
    )
    for name, column_type, nullable, server_default in tenant_fields:
        if name not in tenant_columns:
            op.add_column("tenants", sa.Column(name, column_type, nullable=nullable, server_default=server_default))


def downgrade() -> None:
    op.drop_column("tenants", "order_tracking_media_type")
    op.drop_column("tenants", "order_tracking_media_url")
    op.drop_column("tenants", "order_tracking_steps")
    op.drop_column("tenants", "order_tracking_carriers")
    op.drop_column("tenants", "order_tracking_shipping_policy_url")
    op.drop_column("tenants", "order_tracking_body")
    op.drop_column("tenants", "order_tracking_heading")
    op.drop_column("tenants", "order_tracking_eyebrow")
