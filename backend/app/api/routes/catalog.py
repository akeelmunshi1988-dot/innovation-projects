import os
import uuid
import json
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.core.slugify import unique_rug_slug
from app.models.models import RugCatalog, RugImage, Material, StaffUser, Tenant, CatalogSizeMaster, WeaveTypeMaster, PileHeightMaster
from app.schemas.schemas import (
    RugCatalogCreate, RugCatalogUpdate, RugCatalog as RugCatalogSchema,
    RugImageCreate, RugImageUpdate, RugImage as RugImageSchema,
    CatalogSizeMasterCreate, CatalogSizeMasterUpdate, CatalogSizeMaster as CatalogSizeMasterSchema,
    CatalogAttributeMasterCreate, CatalogAttributeMasterUpdate, CatalogAttributeMaster as CatalogAttributeMasterSchema,
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "rugs")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 20

router = APIRouter()

DEFAULT_WEAVE_TYPES = ["hand-knotted", "hand-tufted", "flatweave", "machine-woven"]
DEFAULT_PILE_HEIGHTS = ["low", "medium", "high", "flat"]


def _attribute_masters(db: Session, tenant_id: int, model, rug_field: str, defaults: List[str]):
    """Return a complete tenant master, backfilling current catalog values and defaults."""
    masters = db.query(model).filter(model.tenant_id == tenant_id).all()
    known = {item.name.strip().lower() for item in masters}
    legacy_values = {
        str(value[0]).strip()
        for value in db.query(getattr(RugCatalog, rug_field)).filter(RugCatalog.tenant_id == tenant_id).all()
        if value[0] and str(value[0]).strip()
    }
    for name in [*defaults, *sorted(legacy_values)]:
        if name.lower() not in known:
            db.add(model(tenant_id=tenant_id, name=name, sort_order=len(known)))
            known.add(name.lower())
    if db.new:
        db.commit()
        masters = db.query(model).filter(model.tenant_id == tenant_id).all()
    return sorted(masters, key=lambda item: (item.sort_order, item.id))


def _create_attribute(body, db: Session, current_user: StaffUser, model):
    name = body.name.strip()
    if model is PileHeightMaster and len(name) > 50:
        raise HTTPException(status_code=422, detail="Pile height must be 50 characters or fewer")
    duplicate = db.query(model).filter(model.tenant_id == current_user.tenant_id).all()
    if any(item.name.strip().lower() == name.lower() for item in duplicate):
        raise HTTPException(status_code=409, detail="That value already exists")
    item = model(tenant_id=current_user.tenant_id, name=name, sort_order=body.sort_order, is_active=body.is_active)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _update_attribute(item_id: int, body, db: Session, current_user: StaffUser, model, rug_field: str):
    item = db.query(model).filter(model.id == item_id, model.tenant_id == current_user.tenant_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Master value not found")
    values = body.model_dump(exclude_unset=True)
    old_name = item.name
    if "name" in values:
        name = values["name"].strip()
        if model is PileHeightMaster and len(name) > 50:
            raise HTTPException(status_code=422, detail="Pile height must be 50 characters or fewer")
        peers = db.query(model).filter(model.tenant_id == current_user.tenant_id, model.id != item_id).all()
        if any(peer.name.strip().lower() == name.lower() for peer in peers):
            raise HTTPException(status_code=409, detail="That value already exists")
        values["name"] = name
    for field, value in values.items():
        setattr(item, field, value)
    if item.name != old_name:
        db.query(RugCatalog).filter(
            RugCatalog.tenant_id == current_user.tenant_id,
            getattr(RugCatalog, rug_field) == old_name,
        ).update({getattr(RugCatalog, rug_field): item.name}, synchronize_session=False)
    db.commit()
    db.refresh(item)
    cache_clear("catalog")
    return item


def _delete_attribute(item_id: int, db: Session, current_user: StaffUser, model, rug_field: str):
    item = db.query(model).filter(model.id == item_id, model.tenant_id == current_user.tenant_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Master value not found")
    in_use = db.query(RugCatalog).filter(
        RugCatalog.tenant_id == current_user.tenant_id,
        getattr(RugCatalog, rug_field) == item.name,
    ).first()
    if in_use:
        raise HTTPException(status_code=409, detail="This value is used by catalog rugs. Deactivate it instead.")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.get("/catalog-weave-types", response_model=List[CatalogAttributeMasterSchema])
def get_catalog_weave_types(db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _attribute_masters(db, current_user.tenant_id, WeaveTypeMaster, "weave_type", DEFAULT_WEAVE_TYPES)


@router.post("/catalog-weave-types", response_model=CatalogAttributeMasterSchema)
def create_catalog_weave_type(body: CatalogAttributeMasterCreate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _create_attribute(body, db, current_user, WeaveTypeMaster)


@router.put("/catalog-weave-types/{item_id}", response_model=CatalogAttributeMasterSchema)
def update_catalog_weave_type(item_id: int, body: CatalogAttributeMasterUpdate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _update_attribute(item_id, body, db, current_user, WeaveTypeMaster, "weave_type")


@router.delete("/catalog-weave-types/{item_id}")
def delete_catalog_weave_type(item_id: int, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _delete_attribute(item_id, db, current_user, WeaveTypeMaster, "weave_type")


@router.get("/catalog-pile-heights", response_model=List[CatalogAttributeMasterSchema])
def get_catalog_pile_heights(db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _attribute_masters(db, current_user.tenant_id, PileHeightMaster, "pile_height", DEFAULT_PILE_HEIGHTS)


@router.post("/catalog-pile-heights", response_model=CatalogAttributeMasterSchema)
def create_catalog_pile_height(body: CatalogAttributeMasterCreate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _create_attribute(body, db, current_user, PileHeightMaster)


@router.put("/catalog-pile-heights/{item_id}", response_model=CatalogAttributeMasterSchema)
def update_catalog_pile_height(item_id: int, body: CatalogAttributeMasterUpdate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _update_attribute(item_id, body, db, current_user, PileHeightMaster, "pile_height")


@router.delete("/catalog-pile-heights/{item_id}")
def delete_catalog_pile_height(item_id: int, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return _delete_attribute(item_id, db, current_user, PileHeightMaster, "pile_height")


@router.get("/catalog-sizes", response_model=List[CatalogSizeMasterSchema])
def get_catalog_sizes(db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    """Return the tenant size master, backfilling legacy per-rug dimensions once."""
    masters = db.query(CatalogSizeMaster).filter(CatalogSizeMaster.tenant_id == current_user.tenant_id).all()
    by_ft = {size.ft.strip().lower(): size for size in masters}
    changed = False
    for rug in db.query(RugCatalog).filter(RugCatalog.tenant_id == current_user.tenant_id).all():
        normalized = []
        for entry in (rug.sizes or []):
            row = dict(entry)
            key = str(row.get("ft") or "").strip().lower()
            if not key:
                continue
            master = by_ft.get(key)
            if master is None:
                master = CatalogSizeMaster(tenant_id=current_user.tenant_id, ft=str(row["ft"]).strip(), cm=row.get("cm"), sort_order=len(by_ft))
                db.add(master)
                db.flush()
                by_ft[key] = master
                masters.append(master)
            if row.get("master_size_id") != master.id:
                row["master_size_id"] = master.id
                changed = True
            normalized.append(row)
        if normalized != (rug.sizes or []):
            rug.sizes = normalized
    if changed or db.new:
        db.commit()
    return sorted(masters, key=lambda size: (size.sort_order, size.id))


@router.post("/catalog-sizes", response_model=CatalogSizeMasterSchema)
def create_catalog_size(body: CatalogSizeMasterCreate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    ft = body.ft.strip()
    if db.query(CatalogSizeMaster).filter(CatalogSizeMaster.tenant_id == current_user.tenant_id, CatalogSizeMaster.ft == ft).first():
        raise HTTPException(status_code=409, detail="That feet size already exists")
    values = body.model_dump()
    values.update({"ft": ft, "cm": body.cm.strip() if body.cm else None, "tenant_id": current_user.tenant_id})
    master = CatalogSizeMaster(**values)
    db.add(master)
    db.flush()
    for rug in db.query(RugCatalog).filter(RugCatalog.tenant_id == current_user.tenant_id).all():
        sizes = list(rug.sizes or [])
        sizes.append({"master_size_id": master.id, "ft": master.ft, "cm": master.cm, "price": rug.base_price, "lead_time_days": rug.lead_time_days, "is_default": not sizes})
        rug.sizes = sizes
    db.commit()
    db.refresh(master)
    cache_clear("catalog")
    return master


@router.put("/catalog-sizes/{size_id}", response_model=CatalogSizeMasterSchema)
def update_catalog_size(size_id: int, body: CatalogSizeMasterUpdate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    master = db.query(CatalogSizeMaster).filter(CatalogSizeMaster.id == size_id, CatalogSizeMaster.tenant_id == current_user.tenant_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Size not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(master, field, value.strip() if isinstance(value, str) else value)
    for rug in db.query(RugCatalog).filter(RugCatalog.tenant_id == current_user.tenant_id).all():
        rug.sizes = [{**entry, "ft": master.ft, "cm": master.cm} if entry.get("master_size_id") == master.id else entry for entry in (rug.sizes or [])]
    db.commit()
    db.refresh(master)
    cache_clear("catalog")
    return master


@router.delete("/catalog-sizes/{size_id}")
def delete_catalog_size(size_id: int, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    master = db.query(CatalogSizeMaster).filter(CatalogSizeMaster.id == size_id, CatalogSizeMaster.tenant_id == current_user.tenant_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Size not found")
    if any(any(entry.get("master_size_id") == size_id for entry in (rug.sizes or [])) for rug in db.query(RugCatalog).filter(RugCatalog.tenant_id == current_user.tenant_id)):
        raise HTTPException(status_code=409, detail="This size is associated with catalog rugs. Deactivate it instead.")
    db.delete(master)
    db.commit()
    return {"ok": True}


@router.post("/catalog/upload-image")
async def upload_rug_image(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return JSONResponse({"url": f"/static/rugs/{filename}"})


@router.post("/catalog/upload-image-cropped")
async def upload_rug_image_cropped(
    file: UploadFile = File(...),
    corners: str = Form(...),
    current_user: StaffUser = Depends(get_current_user),
):
    """Same as /catalog/upload-image, but perspective-corrects the upload to
    the given quad first (e.g. a rug photographed at an angle) — corners is a
    JSON [[x,y],[x,y],[x,y],[x,y]] list in TL/TR/BR/BL order, natural-image-
    pixel space, matching the convention used by /replace-rug's corner picker."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_SIZE_MB}MB allowed.")

    arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    try:
        pts = json.loads(corners)
        if len(pts) != 4:
            raise ValueError
        pts_src = np.array(pts, dtype=np.float32)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="corners must be a JSON list of exactly 4 [x, y] points.")

    # Classic scanner-crop sizing: destination rectangle's edges match the
    # quad's own (longest) edge lengths, so the correction doesn't stretch
    # the content beyond its actual captured resolution.
    tl, tr, br, bl = pts_src
    dst_w = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    dst_h = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    dst_w, dst_h = max(dst_w, 10), max(dst_h, 10)

    pts_dst = np.array([[0, 0], [dst_w, 0], [dst_w, dst_h], [0, dst_h]], dtype=np.float32)
    matrix = cv2.getPerspectiveTransform(pts_src, pts_dst)
    cropped = cv2.warpPerspective(img, matrix, (dst_w, dst_h), flags=cv2.INTER_LANCZOS4)

    filename = f"{uuid.uuid4().hex}.jpg"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)
    cv2.imwrite(filepath, cropped, [cv2.IMWRITE_JPEG_QUALITY, 92])

    return JSONResponse({"url": f"/static/rugs/{filename}"})


@router.get("/catalog", response_model=List[RugCatalogSchema])
def get_catalog(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return db.query(RugCatalog).filter(RugCatalog.tenant_id == current_user.tenant_id).all()


@router.get("/catalog/{rug_id}", response_model=RugCatalogSchema)
def get_rug(
    rug_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    rug = db.query(RugCatalog).filter(
        RugCatalog.id == rug_id,
        RugCatalog.tenant_id == current_user.tenant_id,
    ).first()
    if not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    return rug


def create_rug_row(db: Session, data: dict, tenant_id: int) -> RugCatalog:
    """Shared by POST /catalog and the AI-assistant confirm endpoint
    (app/api/routes/chat.py) so both paths create a rug identically."""
    material = db.query(Material).filter(
        Material.id == data.get("material_id"),
        Material.tenant_id == tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    _attribute_masters(db, tenant_id, WeaveTypeMaster, "weave_type", DEFAULT_WEAVE_TYPES)
    _attribute_masters(db, tenant_id, PileHeightMaster, "pile_height", DEFAULT_PILE_HEIGHTS)
    for field, model in (("weave_type", WeaveTypeMaster), ("pile_height", PileHeightMaster)):
        value = data.get(field)
        if value and not db.query(model).filter(
            model.tenant_id == tenant_id,
            model.name == value,
            model.is_active == True,
        ).first():
            raise HTTPException(status_code=422, detail=f"Select an active {field.replace('_', ' ')} from the master list")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    data = dict(data)
    data["base_price_currency"] = data.get("base_price_currency") or (tenant.base_currency if tenant else None)
    slug = unique_rug_slug(db, data["name"], tenant_id)
    db_rug = RugCatalog(**data, tenant_id=tenant_id, slug=slug)
    db.add(db_rug)
    db.commit()
    db.refresh(db_rug)
    cache_clear("catalog")
    return db_rug


def update_rug_row(db: Session, rug: RugCatalog, updates: dict) -> RugCatalog:
    _attribute_masters(db, rug.tenant_id, WeaveTypeMaster, "weave_type", DEFAULT_WEAVE_TYPES)
    _attribute_masters(db, rug.tenant_id, PileHeightMaster, "pile_height", DEFAULT_PILE_HEIGHTS)
    for field, model in (("weave_type", WeaveTypeMaster), ("pile_height", PileHeightMaster)):
        value = updates.get(field)
        if value and not db.query(model).filter(
            model.tenant_id == rug.tenant_id,
            model.name == value,
            model.is_active == True,
        ).first():
            raise HTTPException(status_code=422, detail=f"Select an active {field.replace('_', ' ')} from the master list")
    for field, value in updates.items():
        setattr(rug, field, value)
    db.commit()
    db.refresh(rug)
    cache_clear("catalog")
    return rug


def delete_rug_row(db: Session, rug: RugCatalog) -> None:
    db.delete(rug)
    db.commit()
    cache_clear("catalog")


@router.post("/catalog", response_model=RugCatalogSchema)
def create_rug(
    rug: RugCatalogCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return create_rug_row(db, rug.model_dump(), current_user.tenant_id)


@router.put("/catalog/{rug_id}", response_model=RugCatalogSchema)
def update_rug(
    rug_id: int,
    rug_update: RugCatalogUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    rug = db.query(RugCatalog).filter(
        RugCatalog.id == rug_id,
        RugCatalog.tenant_id == current_user.tenant_id,
    ).first()
    if not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    return update_rug_row(db, rug, rug_update.model_dump(exclude_unset=True))


@router.delete("/catalog/{rug_id}")
def delete_rug(
    rug_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    rug = db.query(RugCatalog).filter(
        RugCatalog.id == rug_id,
        RugCatalog.tenant_id == current_user.tenant_id,
    ).first()
    if not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    delete_rug_row(db, rug)
    return {"message": "Rug deleted successfully"}


# ── Rug gallery images ──────────────────────────────────────────────────────

def add_rug_image_row(db: Session, rug_id: int, image_url: str, sort_order: int = 0) -> RugImage:
    """Shared by POST /catalog/{rug_id}/images and the public API
    (app/api/routes/public_api.py) so both paths add a gallery image identically.
    Caller must have already verified the rug belongs to the right tenant."""
    image = RugImage(rug_catalog_id=rug_id, image_url=image_url, sort_order=sort_order)
    db.add(image)
    db.commit()
    db.refresh(image)
    cache_clear("catalog")
    return image


def update_rug_image_row(db: Session, image: RugImage, sort_order: int) -> RugImage:
    image.sort_order = sort_order
    db.commit()
    db.refresh(image)
    cache_clear("catalog")
    return image


def delete_rug_image_row(db: Session, image: RugImage) -> None:
    db.delete(image)
    db.commit()
    cache_clear("catalog")


def get_tenant_rug_image(db: Session, image_id: int, tenant_id: int) -> Optional[RugImage]:
    """Looks up a gallery image while enforcing it belongs to a rug in this
    tenant's catalog — the join is the tenant check, since RugImage has no
    tenant_id column of its own."""
    return (
        db.query(RugImage)
        .join(RugCatalog, RugImage.rug_catalog_id == RugCatalog.id)
        .filter(RugImage.id == image_id, RugCatalog.tenant_id == tenant_id)
        .first()
    )


@router.post("/catalog/{rug_id}/images", response_model=RugImageSchema)
def add_rug_image(
    rug_id: int,
    body: RugImageCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    rug = db.query(RugCatalog).filter(
        RugCatalog.id == rug_id,
        RugCatalog.tenant_id == current_user.tenant_id,
    ).first()
    if not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    return add_rug_image_row(db, rug_id, body.image_url, body.sort_order)


@router.patch("/catalog/images/{image_id}", response_model=RugImageSchema)
def update_rug_image(
    image_id: int,
    body: RugImageUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = get_tenant_rug_image(db, image_id, current_user.tenant_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return update_rug_image_row(db, image, body.sort_order)


@router.delete("/catalog/images/{image_id}")
def delete_rug_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = get_tenant_rug_image(db, image_id, current_user.tenant_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    delete_rug_image_row(db, image)
    cache_clear("catalog")
    return {"message": "Image deleted successfully"}
