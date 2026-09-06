"""Add tenant-scoped space and mood masters, preserving existing catalog tags."""
from alembic import op
import sqlalchemy as sa

revision = '20260906_0031'
down_revision = '20260906_0030'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    tenants = sa.table('tenants', sa.column('id', sa.Integer))
    rugs = sa.table('rug_catalog', sa.column('tenant_id', sa.Integer), sa.column('room_types', sa.JSON), sa.column('mood_tags', sa.JSON))
    for table_name, field, defaults in [
        ('space_master', 'room_types', ['living_room', 'bedroom', 'dining_room', 'entryway']),
        ('mood_master', 'mood_tags', ['warm_earthy', 'quiet_luxury', 'modern_minimal', 'bohemian', 'bold_artistic', 'timeless_traditional']),
    ]:
        table = op.create_table(table_name,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('tenant_id', sa.Integer, sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
            sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
            sa.UniqueConstraint('tenant_id', 'name', name=f'uq_{table_name}_tenant_name'),
        )
        op.create_index(f'ix_{table_name}_id', table_name, ['id'])
        op.create_index(f'ix_{table_name}_tenant_id', table_name, ['tenant_id'])
        for tenant_id in bind.execute(sa.select(tenants.c.id)).scalars():
            values = list(defaults)
            for tags in bind.execute(sa.select(rugs.c[field]).where(rugs.c.tenant_id == tenant_id)).scalars():
                for tag in tags or []:
                    if tag and tag not in values:
                        values.append(tag)
            bind.execute(table.insert(), [dict(tenant_id=tenant_id, name=name, sort_order=index, is_active=True) for index, name in enumerate(values)])


def downgrade():
    op.drop_table('mood_master')
    op.drop_table('space_master')
