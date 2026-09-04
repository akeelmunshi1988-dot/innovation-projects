"""Add tenant master tables for weave types and pile heights."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0021"
down_revision = "20260904_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "weave_type_master" not in tables:
        op.create_table(
            "weave_type_master",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id", "name", name="uq_weave_type_master_tenant_name"),
        )
    if "pile_height_master" not in tables:
        op.create_table(
            "pile_height_master",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=50), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tenant_id", "name", name="uq_pile_height_master_tenant_name"),
        )

    inspector = sa.inspect(bind)
    weave_indexes = {index["name"] for index in inspector.get_indexes("weave_type_master")}
    pile_indexes = {index["name"] for index in inspector.get_indexes("pile_height_master")}
    if "ix_weave_type_master_id" not in weave_indexes:
        op.create_index("ix_weave_type_master_id", "weave_type_master", ["id"], unique=False)
    if "ix_weave_type_master_tenant_id" not in weave_indexes:
        op.create_index("ix_weave_type_master_tenant_id", "weave_type_master", ["tenant_id"], unique=False)
    if "ix_pile_height_master_id" not in pile_indexes:
        op.create_index("ix_pile_height_master_id", "pile_height_master", ["id"], unique=False)
    if "ix_pile_height_master_tenant_id" not in pile_indexes:
        op.create_index("ix_pile_height_master_tenant_id", "pile_height_master", ["tenant_id"], unique=False)

    op.execute(sa.text("""
        INSERT INTO weave_type_master (tenant_id, name, sort_order, is_active)
        SELECT tenants.id, defaults.name, defaults.sort_order, true
        FROM tenants
        CROSS JOIN (VALUES
            ('hand-knotted', 0), ('hand-tufted', 1), ('flatweave', 2), ('machine-woven', 3)
        ) AS defaults(name, sort_order)
        ON CONFLICT (tenant_id, name) DO NOTHING
    """))
    op.execute(sa.text("""
        INSERT INTO pile_height_master (tenant_id, name, sort_order, is_active)
        SELECT tenants.id, defaults.name, defaults.sort_order, true
        FROM tenants
        CROSS JOIN (VALUES ('low', 0), ('medium', 1), ('high', 2), ('flat', 3)) AS defaults(name, sort_order)
        ON CONFLICT (tenant_id, name) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_index("ix_pile_height_master_tenant_id", table_name="pile_height_master")
    op.drop_index("ix_pile_height_master_id", table_name="pile_height_master")
    op.drop_table("pile_height_master")
    op.drop_index("ix_weave_type_master_tenant_id", table_name="weave_type_master")
    op.drop_index("ix_weave_type_master_id", table_name="weave_type_master")
    op.drop_table("weave_type_master")
