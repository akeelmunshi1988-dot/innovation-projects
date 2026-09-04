"""Add admin-managed image grid for the custom rug request page."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0022"
down_revision = "20260904_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "custom_rug_page_images" not in inspector.get_table_names():
        op.create_table(
            "custom_rug_page_images",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=150), nullable=False),
            sa.Column("image_url", sa.String(length=500), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    inspector = sa.inspect(bind)
    indexes = {index["name"] for index in inspector.get_indexes("custom_rug_page_images")}
    if "ix_custom_rug_page_images_id" not in indexes:
        op.create_index("ix_custom_rug_page_images_id", "custom_rug_page_images", ["id"], unique=False)
    if "ix_custom_rug_page_images_tenant_id" not in indexes:
        op.create_index("ix_custom_rug_page_images_tenant_id", "custom_rug_page_images", ["tenant_id"], unique=False)
    if "ix_custom_rug_page_images_tenant_sort" not in indexes:
        op.create_index("ix_custom_rug_page_images_tenant_sort", "custom_rug_page_images", ["tenant_id", "sort_order"], unique=False)

    op.execute(sa.text("""
        INSERT INTO custom_rug_page_images (tenant_id, title, image_url, sort_order, is_active)
        SELECT tenants.id, defaults.title, defaults.image_url, defaults.sort_order, true
        FROM tenants
        CROSS JOIN (VALUES
            ('Design', '/static/journey/design.jpg', 0),
            ('Material', '/static/materials/wool.jpg', 1),
            ('Weaving', '/static/journey/weaving.jpg', 2),
            ('Quality Inspection', '/static/workshop/087b47494cc84953bc275b7f951d0216.jpg', 3),
            ('Global Delivery', '/static/journey/delivery.jpg', 4)
        ) AS defaults(title, image_url, sort_order)
        WHERE NOT EXISTS (
            SELECT 1 FROM custom_rug_page_images existing WHERE existing.tenant_id = tenants.id
        )
    """))


def downgrade() -> None:
    op.drop_index("ix_custom_rug_page_images_tenant_sort", table_name="custom_rug_page_images")
    op.drop_index("ix_custom_rug_page_images_tenant_id", table_name="custom_rug_page_images")
    op.drop_index("ix_custom_rug_page_images_id", table_name="custom_rug_page_images")
    op.drop_table("custom_rug_page_images")
