import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.models.models import ProjectGalleryItem, ProjectGalleryImage, StaffUser
from app.schemas.schemas import (
    ProjectGalleryItemCreate, ProjectGalleryItemUpdate, ProjectGalleryItem as ProjectGalleryItemSchema,
    ProjectGalleryImageCreate, ProjectGalleryImageUpdate, ProjectGalleryImage as ProjectGalleryImageSchema,
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "gallery")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_MB = 20

router = APIRouter()


@router.post("/gallery-items/upload-image")
async def upload_gallery_image(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_IMAGE_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return JSONResponse({"url": f"/static/gallery/{filename}"})


@router.get("/gallery-items", response_model=List[ProjectGalleryItemSchema])
def get_gallery_items(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(ProjectGalleryItem)
        .filter(ProjectGalleryItem.tenant_id == current_user.tenant_id)
        .order_by(ProjectGalleryItem.sort_order.asc(), ProjectGalleryItem.id.asc())
        .all()
    )


@router.post("/gallery-items", response_model=ProjectGalleryItemSchema)
def create_gallery_item(
    item: ProjectGalleryItemCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    db_item = ProjectGalleryItem(**item.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    cache_clear("gallery_items")
    return db_item


@router.put("/gallery-items/{item_id}", response_model=ProjectGalleryItemSchema)
def update_gallery_item(
    item_id: int,
    item_update: ProjectGalleryItemUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    item = db.query(ProjectGalleryItem).filter(
        ProjectGalleryItem.id == item_id,
        ProjectGalleryItem.tenant_id == current_user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    for field, value in item_update.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    cache_clear("gallery_items")
    return item


@router.delete("/gallery-items/{item_id}")
def delete_gallery_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    item = db.query(ProjectGalleryItem).filter(
        ProjectGalleryItem.id == item_id,
        ProjectGalleryItem.tenant_id == current_user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    db.delete(item)
    db.commit()
    cache_clear("gallery_items")
    return {"message": "Gallery item deleted successfully"}


# ── Project gallery images (mirrors catalog.py's rug-gallery-image routes) ──

def get_tenant_gallery_image(db: Session, image_id: int, tenant_id: int) -> Optional[ProjectGalleryImage]:
    """Looks up a gallery image while enforcing it belongs to a project in
    this tenant's gallery — the join is the tenant check, since
    ProjectGalleryImage has no tenant_id column of its own."""
    return (
        db.query(ProjectGalleryImage)
        .join(ProjectGalleryItem, ProjectGalleryImage.project_gallery_item_id == ProjectGalleryItem.id)
        .filter(ProjectGalleryImage.id == image_id, ProjectGalleryItem.tenant_id == tenant_id)
        .first()
    )


@router.post("/gallery-items/{item_id}/images", response_model=ProjectGalleryImageSchema)
def add_gallery_image(
    item_id: int,
    body: ProjectGalleryImageCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    item = db.query(ProjectGalleryItem).filter(
        ProjectGalleryItem.id == item_id,
        ProjectGalleryItem.tenant_id == current_user.tenant_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    image = ProjectGalleryImage(project_gallery_item_id=item_id, image_url=body.image_url, sort_order=body.sort_order)
    db.add(image)
    db.commit()
    db.refresh(image)
    cache_clear("gallery_items")
    return image


@router.patch("/gallery-items/images/{image_id}", response_model=ProjectGalleryImageSchema)
def update_gallery_image(
    image_id: int,
    body: ProjectGalleryImageUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = get_tenant_gallery_image(db, image_id, current_user.tenant_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    image.sort_order = body.sort_order
    db.commit()
    db.refresh(image)
    cache_clear("gallery_items")
    return image


@router.delete("/gallery-items/images/{image_id}")
def delete_gallery_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = get_tenant_gallery_image(db, image_id, current_user.tenant_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(image)
    db.commit()
    cache_clear("gallery_items")
    return {"message": "Image deleted successfully"}
