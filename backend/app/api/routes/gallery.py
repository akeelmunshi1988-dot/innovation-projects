import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.models.models import ProjectGalleryItem, StaffUser
from app.schemas.schemas import ProjectGalleryItemCreate, ProjectGalleryItemUpdate, ProjectGalleryItem as ProjectGalleryItemSchema

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
