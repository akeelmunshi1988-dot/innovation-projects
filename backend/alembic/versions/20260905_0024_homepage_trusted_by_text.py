"""Allow administrators to override the homepage trusted-by customer text."""
from alembic import op
import sqlalchemy as sa

revision = "20260905_0024"
down_revision = "20260905_0023"
branch_labels = None
depends_on = None


def upgrade():
    columns = {column['name'] for column in sa.inspect(op.get_bind()).get_columns('tenants')}
    if 'homepage_intro_trusted_by_text' not in columns:
        op.add_column('tenants', sa.Column('homepage_intro_trusted_by_text', sa.String(100), nullable=True))


def downgrade():
    op.drop_column('tenants', 'homepage_intro_trusted_by_text')
