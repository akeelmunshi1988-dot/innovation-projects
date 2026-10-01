"""Customer reviews on catalog rugs, moderated before they appear on the storefront."""

from alembic import op
import sqlalchemy as sa


revision = "20261002_0035"
down_revision = "20260930_0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rug_reviews",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("rug_id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("is_verified_buyer", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_rug_reviews_rating"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rug_id"], ["rug_catalog.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rug_reviews_id", "rug_reviews", ["id"], unique=False)
    op.create_index("ix_rug_reviews_tenant_rug_status", "rug_reviews", ["tenant_id", "rug_id", "status"], unique=False)
    op.create_index("ix_rug_reviews_tenant_status_created", "rug_reviews", ["tenant_id", "status", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_rug_reviews_tenant_status_created", table_name="rug_reviews")
    op.drop_index("ix_rug_reviews_tenant_rug_status", table_name="rug_reviews")
    op.drop_index("ix_rug_reviews_id", table_name="rug_reviews")
    op.drop_table("rug_reviews")
