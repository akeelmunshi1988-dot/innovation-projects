"""Replace fixed rug sample/care/shipping columns with a dynamic accordion section list."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


revision = "20260905_0025"
down_revision = "20260905_0024"
branch_labels = None
depends_on = None

tenants = table(
    "tenants",
    column("id", sa.Integer),
    column("rug_sample_information_html", sa.Text),
    column("rug_care_advice_html", sa.Text),
    column("rug_shipping_returns_html", sa.Text),
    column("product_accordion_sections", sa.JSON),
)


def upgrade() -> None:
    op.add_column("tenants", sa.Column("product_accordion_sections", sa.JSON(), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.select(
            tenants.c.id,
            tenants.c.rug_sample_information_html,
            tenants.c.rug_care_advice_html,
            tenants.c.rug_shipping_returns_html,
        )
    ).fetchall()
    for row in rows:
        sections = []
        if row.rug_sample_information_html:
            sections.append({"id": "sample", "title": "Rug Sample", "html": row.rug_sample_information_html})
        if row.rug_care_advice_html:
            sections.append({"id": "care", "title": "Care Advice", "html": row.rug_care_advice_html})
        if row.rug_shipping_returns_html:
            sections.append({"id": "shipping", "title": "Shipping & Returns", "html": row.rug_shipping_returns_html})
        if sections:
            connection.execute(
                tenants.update().where(tenants.c.id == row.id).values(product_accordion_sections=sections)
            )

    op.drop_column("tenants", "rug_sample_information_html")
    op.drop_column("tenants", "rug_care_advice_html")
    op.drop_column("tenants", "rug_shipping_returns_html")


def downgrade() -> None:
    op.add_column("tenants", sa.Column("rug_sample_information_html", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("rug_care_advice_html", sa.Text(), nullable=True))
    op.add_column("tenants", sa.Column("rug_shipping_returns_html", sa.Text(), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.select(tenants.c.id, tenants.c.product_accordion_sections)).fetchall()
    for row in rows:
        by_id = {item.get("id"): item.get("html") for item in (row.product_accordion_sections or [])}
        connection.execute(
            tenants.update().where(tenants.c.id == row.id).values(
                rug_sample_information_html=by_id.get("sample"),
                rug_care_advice_html=by_id.get("care"),
                rug_shipping_returns_html=by_id.get("shipping"),
            )
        )

    op.drop_column("tenants", "product_accordion_sections")
