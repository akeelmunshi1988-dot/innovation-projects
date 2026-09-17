"""Tenant-managed editorial imagery for collection landing pages."""
import random
from typing import List
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.slugify import slugify
from app.models.models import CollectionDisplay, StaffUser, Tenant, WeaveTypeMaster, RugCatalog, Material

router = APIRouter()
CATEGORY_VALUES = {
    "weave": ["hand-knotted", "hand-tufted", "flatweave", "machine-woven"],
    "space": ["living_room", "bedroom", "dining_room", "entryway"],
    "mood": ["warm_earthy", "quiet_luxury", "modern_minimal", "bohemian", "bold_artistic", "timeless_traditional"],
    "material": ["wool", "silk", "cotton", "synthetic"],
}


def categories(db, tenant_id):
    values = {key: list(items) for key, items in CATEGORY_VALUES.items()}
    values["weave"] = sorted(set(values["weave"]) | {
        item.name for item in db.query(WeaveTypeMaster).filter_by(tenant_id=tenant_id, is_active=True)
    } | {row[0] for row in db.query(RugCatalog.weave_type).filter_by(tenant_id=tenant_id) if row[0]})
    return [{"key": "default", "label": "All rugs (default)", "href": "/catalog"}] + [
        {"key": f"{facet}/{value}", "label": f"{facet.title()}: {value.replace('_', ' ').replace('-', ' ').title()}",
         "href": f"/weaves/{value}" if facet == "weave" else f"/collections/{facet}/{value}"}
        for facet, entries in values.items() for value in entries
    ]


class DisplayImage(BaseModel):
    image_url: str = Field(..., max_length=500)
    caption: str = Field("", max_length=180)

    @field_validator("image_url")
    @classmethod
    def image_path(cls, value):
        value = value.strip()
        if value and not (value.startswith("/static/") or (
            urlsplit(value).scheme in {"http", "https"} and urlsplit(value).netloc
        )):
            raise ValueError("Use an uploaded image or an HTTP(S) image URL")
        return value


class DisplayBody(BaseModel):
    enabled: bool = False
    images: List[DisplayImage] = Field(..., min_length=3, max_length=3)


def serialize(row):
    return {"enabled": row.enabled, "images": row.images} if row else {
        "enabled": False, "images": [{"image_url": "", "caption": ""} for _ in range(3)]
    }


@router.get("/catalog-display-categories")
def list_categories(db: Session = Depends(get_db), user: StaffUser = Depends(get_current_user)):
    return categories(db, user.tenant_id)


@router.get("/catalog-display")
def get_display(category: str, db: Session = Depends(get_db), user: StaffUser = Depends(get_current_user)):
    return serialize(db.query(CollectionDisplay).filter_by(tenant_id=user.tenant_id, category=category).first())


@router.put("/catalog-display")
def save_display(category: str, body: DisplayBody, db: Session = Depends(get_db), user: StaffUser = Depends(get_current_user)):
    if category not in {item["key"] for item in categories(db, user.tenant_id)}:
        raise HTTPException(422, "Choose an available catalog category")
    row = db.query(CollectionDisplay).filter_by(tenant_id=user.tenant_id, category=category).first()
    if row is None:
        row = CollectionDisplay(tenant_id=user.tenant_id, category=category)
        db.add(row)
    row.enabled = True
    row.images = [image.model_dump() for image in body.images]
    db.commit()
    return serialize(row)


class BulkDisplayBody(DisplayBody):
    categories: List[str] = Field(..., min_length=1, max_length=200)


@router.put("/catalog-displays")
def save_displays(body: BulkDisplayBody, db: Session = Depends(get_db), user: StaffUser = Depends(get_current_user)):
    keys = set(body.categories)
    if not keys.issubset({item["key"] for item in categories(db, user.tenant_id)}):
        raise HTTPException(422, "Choose available catalog categories")
    rows = {row.category: row for row in db.query(CollectionDisplay).filter(
        CollectionDisplay.tenant_id == user.tenant_id, CollectionDisplay.category.in_(keys)
    )}
    for key in keys:
        row = rows.get(key)
        if row is None:
            row = CollectionDisplay(tenant_id=user.tenant_id, category=key)
            db.add(row)
        row.enabled = True
        row.images = [image.model_dump() for image in body.images]
    db.commit()
    return {"saved_categories": sorted(keys)}


@router.get("/customer/catalog-display")
def public_display(category: str, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).first()
    if tenant is None:
        return serialize(None)
    # No worker-local cache: saved image changes are visible immediately.
    # Styling is always active. Saved photos override automatic images, including
    # drafts created by the original editor's hidden/three-required-images gate.
    row = db.query(CollectionDisplay).filter_by(tenant_id=tenant.id, category=category).first()
    custom = row.images if row else []
    images = [{"image_url": custom[index].get("image_url", "") if index < len(custom) else "",
               "caption": custom[index].get("caption", "") if index < len(custom) else ""} for index in range(3)]

    # Rugs actually tagged for this mood/space/weave/material are tried before the
    # tenant's generic "default" showcase images, so e.g. /collections/mood/warm_earthy
    # shows warm/earthy rugs instead of whatever unrelated default grid is configured.
    if any(not image["image_url"] for image in images):
        facet, _, value = category.partition("/")
        value_slug = slugify(value)
        rugs = db.query(RugCatalog).join(Material, RugCatalog.material_id == Material.id).filter(
            RugCatalog.tenant_id == tenant.id, Material.tenant_id == tenant.id,
        ).order_by(RugCatalog.id).all()
        # Compared as slugs, not raw equality: catalog rows use freeform vendor-entered
        # values ("Hand-woven Flat Weave", "living-room", material *names* like "Jute")
        # that don't line up character-for-character with the fixed URL vocabulary
        # (CATEGORY_VALUES) or each other — see the material name/type note below.
        matching = [rug for rug in rugs if category == "default" or (
            (facet == "weave" and rug.weave_type and slugify(rug.weave_type) == value_slug) or
            (facet == "space" and any(slugify(room) == value_slug for room in (rug.room_types or []))) or
            (facet == "mood" and any(slugify(mood) == value_slug for mood in (rug.mood_tags or []))) or
            # Material.type is only a coarse wool/silk/cotton/synthetic bucket — the
            # /collections/material/<value> URL vocabulary is the specific Material.name
            # (e.g. "Jute", "Handspun New Zealand Wool"), so check both.
            (facet == "material" and value_slug in {slugify(rug.material.name), slugify(rug.material.type)})
        )]
        # Each matching rug's photo gallery (styled room/texture shots) reads far better
        # in this full-bleed editorial banner than its flat product-cutout catalog
        # thumbnail, so prefer gallery photos and fall back to the thumbnail only for a
        # rug with no gallery yet. Pooled and shuffled (not always the same 3) so a
        # category with only one match still fills all 3 slots from that rug's own
        # gallery instead of falling through to unrelated tenant-default images.
        photos = [
            url for rug in matching
            for url in ([img.image_url for img in rug.images] or ([rug.image_url] if rug.image_url else []))
        ]
        random.shuffle(photos)
        used = {image["image_url"] for image in images if image["image_url"]}
        for image in images:
            if not image["image_url"]:
                match = next((photo for photo in photos if photo not in used), None)
                if match:
                    image["image_url"] = match
                    used.add(match)

    if any(not image["image_url"] for image in images):
        default = db.query(CollectionDisplay).filter_by(tenant_id=tenant.id, category="default").first()
        defaults = default.images if default else []
        for index, image in enumerate(images):
            if not image["image_url"] and index < len(defaults):
                fallback = defaults[index]
                image["image_url"] = fallback.get("image_url", "")
                image["caption"] = image["caption"] or fallback.get("caption", "")

    if any(not image["image_url"] for image in images):
        # Bundled craft photos keep empty collections visually complete.
        bundled = ["/static/journey/design.jpg", "/static/journey/weaving.jpg", "/static/journey/delivery.jpg"]
        used = {image["image_url"] for image in images if image["image_url"]}
        for image in images:
            if not image["image_url"]:
                image["image_url"] = next((photo for photo in bundled if photo not in used), bundled[0])
                used.add(image["image_url"])

    return {"enabled": True, "images": images}
