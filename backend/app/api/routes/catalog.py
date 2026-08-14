import os
import uuid
import json
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.core.slugify import unique_rug_slug
from app.models.models import RugCatalog, RugImage, Material, StaffUser
from app.schemas.schemas import (
    RugCatalogCreate, RugCatalogUpdate, RugCatalog as RugCatalogSchema,
    RugImageCreate, RugImageUpdate, RugImage as RugImageSchema,
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "rugs")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 20

router = APIRouter()


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


@router.post("/catalog", response_model=RugCatalogSchema)
def create_rug(
    rug: RugCatalogCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    material = db.query(Material).filter(
        Material.id == rug.material_id,
        Material.tenant_id == current_user.tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    data = rug.model_dump()
    data['base_price_currency'] = data.get('base_price_currency') or current_user.tenant.base_currency
    slug = unique_rug_slug(db, rug.name, current_user.tenant_id)
    db_rug = RugCatalog(**data, tenant_id=current_user.tenant_id, slug=slug)
    db.add(db_rug)
    db.commit()
    db.refresh(db_rug)
    cache_clear("catalog")
    return db_rug


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
    for field, value in rug_update.model_dump(exclude_unset=True).items():
        setattr(rug, field, value)
    db.commit()
    db.refresh(rug)
    cache_clear("catalog")
    return rug


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
    db.delete(rug)
    db.commit()
    cache_clear("catalog")
    return {"message": "Rug deleted successfully"}


# ── Rug gallery images ──────────────────────────────────────────────────────

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
    image = RugImage(rug_catalog_id=rug_id, image_url=body.image_url, sort_order=body.sort_order)
    db.add(image)
    db.commit()
    db.refresh(image)
    cache_clear("catalog")
    return image


@router.patch("/catalog/images/{image_id}", response_model=RugImageSchema)
def update_rug_image(
    image_id: int,
    body: RugImageUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = (
        db.query(RugImage)
        .join(RugCatalog, RugImage.rug_catalog_id == RugCatalog.id)
        .filter(RugImage.id == image_id, RugCatalog.tenant_id == current_user.tenant_id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    image.sort_order = body.sort_order
    db.commit()
    db.refresh(image)
    cache_clear("catalog")
    return image


@router.delete("/catalog/images/{image_id}")
def delete_rug_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = (
        db.query(RugImage)
        .join(RugCatalog, RugImage.rug_catalog_id == RugCatalog.id)
        .filter(RugImage.id == image_id, RugCatalog.tenant_id == current_user.tenant_id)
        .first()
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(image)
    db.commit()
    cache_clear("catalog")
    return {"message": "Image deleted successfully"}
