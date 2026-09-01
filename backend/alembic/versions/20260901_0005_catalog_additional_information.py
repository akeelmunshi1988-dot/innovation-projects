"""Add rich additional product information to catalog rugs."""

from alembic import op
import sqlalchemy as sa

revision = "20260901_0005"
down_revision = "20260901_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rug_catalog", sa.Column("additional_information_html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("rug_catalog", "additional_information_html")
