"""Admin-curated picks for the homepage "Latest Trending Rug Designs" section."""
from alembic import op
import sqlalchemy as sa
revision = '20260907_0033'
down_revision = '20260906_0032'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tenants', sa.Column('trending_rug_ids', sa.JSON(), nullable=True))

def downgrade():
    op.drop_column('tenants', 'trending_rug_ids')
