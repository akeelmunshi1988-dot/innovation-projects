"""Add editable homepage contact section and enquiry inbox."""

from alembic import op
import sqlalchemy as sa


revision = "20260904_0019"
down_revision = "20260904_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tenant_columns = {column["name"] for column in inspector.get_columns("tenants")}
    tenant_fields = (
        ("homepage_contact_image_url", sa.String(length=500), True, None),
        ("homepage_contact_image_alt", sa.String(length=200), True, None),
        ("homepage_contact_heading", sa.String(length=200), True, None),
        ("homepage_contact_consent_text", sa.String(length=300), True, None),
        ("homepage_contact_button_label", sa.String(length=60), True, None),
        ("homepage_contact_success_message", sa.String(length=300), True, None),
        ("homepage_contact_enabled", sa.Boolean(), False, sa.true()),
    )
    for name, column_type, nullable, server_default in tenant_fields:
        if name not in tenant_columns:
            op.add_column("tenants", sa.Column(name, column_type, nullable=nullable, server_default=server_default))

    if "homepage_enquiries" not in inspector.get_table_names():
        op.create_table(
            "homepage_enquiries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("email", sa.String(length=200), nullable=False),
            sa.Column("subject", sa.String(length=250), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("consent", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    inspector = sa.inspect(bind)
    enquiry_indexes = {index["name"] for index in inspector.get_indexes("homepage_enquiries")}
    if "ix_homepage_enquiries_id" not in enquiry_indexes:
        op.create_index("ix_homepage_enquiries_id", "homepage_enquiries", ["id"], unique=False)
    if "ix_homepage_enquiries_tenant_created" not in enquiry_indexes:
        op.create_index("ix_homepage_enquiries_tenant_created", "homepage_enquiries", ["tenant_id", "created_at"], unique=False)
    if "ix_homepage_enquiries_tenant_read" not in enquiry_indexes:
        op.create_index("ix_homepage_enquiries_tenant_read", "homepage_enquiries", ["tenant_id", "is_read"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_homepage_enquiries_tenant_read", table_name="homepage_enquiries")
    op.drop_index("ix_homepage_enquiries_tenant_created", table_name="homepage_enquiries")
    op.drop_index("ix_homepage_enquiries_id", table_name="homepage_enquiries")
    op.drop_table("homepage_enquiries")
    op.drop_column("tenants", "homepage_contact_enabled")
    op.drop_column("tenants", "homepage_contact_success_message")
    op.drop_column("tenants", "homepage_contact_button_label")
    op.drop_column("tenants", "homepage_contact_consent_text")
    op.drop_column("tenants", "homepage_contact_heading")
    op.drop_column("tenants", "homepage_contact_image_alt")
    op.drop_column("tenants", "homepage_contact_image_url")
