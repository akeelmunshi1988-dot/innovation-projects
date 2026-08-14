import re
import unicodedata

from sqlalchemy.orm import Session


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "rug"


def unique_rug_slug(db: Session, name: str, tenant_id: int | None, exclude_id: int | None = None) -> str:
    """Generates a slug from `name`, appending -2, -3, ... until it's unique within the tenant's catalog."""
    from app.models.models import RugCatalog

    base = slugify(name)[:200]
    slug = base
    suffix = 2
    while True:
        q = db.query(RugCatalog).filter(RugCatalog.slug == slug, RugCatalog.tenant_id == tenant_id)
        if exclude_id is not None:
            q = q.filter(RugCatalog.id != exclude_id)
        if not q.first():
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1
