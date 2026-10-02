"""Rotating titles for the homepage Project Gallery section heading."""
from alembic import op
import sqlalchemy as sa
revision = '20261002_0036'
down_revision = '20261002_0035'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tenants', sa.Column('homepage_gallery_titles', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('tenants', 'homepage_gallery_titles')
