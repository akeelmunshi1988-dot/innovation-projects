"""Allow full inventory material names in custom rug requests."""
from alembic import op
import sqlalchemy as sa

revision = '20260906_0030'
down_revision = '20260906_0029'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('quotes', 'material_preference', existing_type=sa.String(50), type_=sa.String(150), existing_nullable=True)


def downgrade():
    op.alter_column('quotes', 'material_preference', existing_type=sa.String(150), type_=sa.String(50), existing_nullable=True)
