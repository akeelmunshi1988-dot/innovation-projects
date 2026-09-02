"""Add admin-editable Custom Rug Journey timeline steps, seeded with current content."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

revision = "20260903_0011"
down_revision = "20260903_0010"
branch_labels = None
depends_on = None

# Content that previously lived hardcoded in frontend/src/pages/CustomerHome.tsx's
# HOW constant — seeded here so the homepage timeline has content from the moment
# this migration runs, before any admin edits it via /admin/journey-steps.
SEED_STEPS = [
    ("Buyer Request", "Share your vision, room dimensions, and style — our team scopes your custom rug request."),
    ("CAD Approval", "A CAD rendering of your design is prepared and shared for sign-off before any material is touched."),
    ("Material Dyeing", "Wool, silk, cotton, or synthetic fibres are dyed in-house to your approved colourway."),
    ("Color Check", "Dyed yarn is matched against the approved palette for consistency before weaving begins."),
    ("Weaving", "Master artisans hand-knot every rug on traditional looms, weeks or months in the making."),
    ("Finishing, Washing & Stretching", "Each rug is trimmed, washed, and stretched to its final shape and pile."),
    ("Quality Check", "Every piece is checked for weave density, accurate sizing, and dye consistency before it ships."),
    ("Packaging & Delivery", "Packed and shipped worldwide, with export documentation handled for you door to door."),
]


def upgrade() -> None:
    op.create_table(
        "rug_journey_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_rug_journey_steps_tenant_id", "rug_journey_steps", ["tenant_id"])
    op.create_index("ix_rug_journey_steps_tenant_sort", "rug_journey_steps", ["tenant_id", "sort_order"])

    # Single-tenant-per-deployment storefront (see get_public_settings() in
    # customer.py) — resolve the one tenant the same way and seed its timeline.
    bind = op.get_bind()
    tenant_id = bind.execute(sa.text("SELECT id FROM tenants ORDER BY id LIMIT 1")).scalar()
    if tenant_id is not None:
        already_seeded = bind.execute(
            sa.text("SELECT COUNT(*) FROM rug_journey_steps WHERE tenant_id = :tid"),
            {"tid": tenant_id},
        ).scalar()
        if not already_seeded:
            steps_table = table(
                "rug_journey_steps",
                column("tenant_id", sa.Integer),
                column("title", sa.String),
                column("description", sa.Text),
                column("sort_order", sa.Integer),
                column("is_active", sa.Boolean),
            )
            op.bulk_insert(steps_table, [
                {
                    "tenant_id": tenant_id,
                    "title": title,
                    "description": description,
                    "sort_order": (i + 1) * 10,
                    "is_active": True,
                }
                for i, (title, description) in enumerate(SEED_STEPS)
            ])


def downgrade() -> None:
    op.drop_index("ix_rug_journey_steps_tenant_sort", table_name="rug_journey_steps")
    op.drop_index("ix_rug_journey_steps_tenant_id", table_name="rug_journey_steps")
    op.drop_table("rug_journey_steps")
