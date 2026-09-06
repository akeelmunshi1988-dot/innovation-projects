"""Add trade partner enquiry inbox."""

from alembic import op
import sqlalchemy as sa


revision = "20260905_0027"
down_revision = "20260905_0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "trade_enquiries" not in inspector.get_table_names():
        op.create_table(
            "trade_enquiries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("first_name", sa.String(length=150), nullable=False),
            sa.Column("last_name", sa.String(length=150), nullable=False),
            sa.Column("email", sa.String(length=200), nullable=False),
            sa.Column("phone", sa.String(length=50), nullable=False),
            sa.Column("city", sa.String(length=150), nullable=True),
            sa.Column("country", sa.String(length=150), nullable=True),
            sa.Column("profession", sa.String(length=50), nullable=False),
            sa.Column("company", sa.String(length=200), nullable=False),
            sa.Column("website", sa.String(length=300), nullable=True),
            sa.Column("project_type", sa.String(length=50), nullable=True),
            sa.Column("project_brief", sa.Text(), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    enquiry_indexes = {index["name"] for index in inspector.get_indexes("trade_enquiries")}
    if "ix_trade_enquiries_id" not in enquiry_indexes:
        op.create_index("ix_trade_enquiries_id", "trade_enquiries", ["id"], unique=False)
    if "ix_trade_enquiries_tenant_created" not in enquiry_indexes:
        op.create_index("ix_trade_enquiries_tenant_created", "trade_enquiries", ["tenant_id", "created_at"], unique=False)
    if "ix_trade_enquiries_tenant_read" not in enquiry_indexes:
        op.create_index("ix_trade_enquiries_tenant_read", "trade_enquiries", ["tenant_id", "is_read"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_trade_enquiries_tenant_read", table_name="trade_enquiries")
    op.drop_index("ix_trade_enquiries_tenant_created", table_name="trade_enquiries")
    op.drop_index("ix_trade_enquiries_id", table_name="trade_enquiries")
    op.drop_table("trade_enquiries")
