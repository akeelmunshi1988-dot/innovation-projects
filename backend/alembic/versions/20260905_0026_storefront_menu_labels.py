"""Add editable storefront navigation titles."""
from alembic import op
import sqlalchemy as sa
revision = '20260905_0026'
down_revision = '20260905_0025'
branch_labels = None
depends_on = None


def upgrade():
    if 'storefront_menu_labels' not in {column['name'] for column in sa.inspect(op.get_bind()).get_columns('tenants')}:
        op.add_column('tenants', sa.Column('storefront_menu_labels', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('tenants', 'storefront_menu_labels')
