"""Persist customer website menu visibility."""
from alembic import op
import sqlalchemy as sa
revision = '20260906_0032'
down_revision = '20260906_0031'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tenants', sa.Column('storefront_menu_visibility', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('tenants', 'storefront_menu_visibility')
