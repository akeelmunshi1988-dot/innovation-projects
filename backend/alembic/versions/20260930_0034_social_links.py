"""Storefront social media profile links shown in the footer contact strip."""
from alembic import op
import sqlalchemy as sa
revision = '20260930_0034'
down_revision = '20260907_0033'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tenants', sa.Column('social_links', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('tenants', 'social_links')
