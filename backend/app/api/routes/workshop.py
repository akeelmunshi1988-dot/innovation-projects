import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import WorkshopPhoto, StaffUser
from app.schemas.schemas import WorkshopPhotoCreate, WorkshopPhotoUpdate, WorkshopPhoto as WorkshopPhotoSchema

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "workshop")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_MB = 20

router = APIRouter()


@router.post("/workshop-photos/upload-image")
async def upload_workshop_image(
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

    return JSONResponse({"url": f"/static/workshop/{filename}"})


@router.get("/workshop-photos", response_model=List[WorkshopPhotoSchema])
def get_workshop_photos(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(WorkshopPhoto)
        .filter(WorkshopPhoto.tenant_id == current_user.tenant_id)
        .order_by(WorkshopPhoto.sort_order.asc(), WorkshopPhoto.id.asc())
        .all()
    )


@router.post("/workshop-photos", response_model=WorkshopPhotoSchema)
def create_workshop_photo(
    photo: WorkshopPhotoCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    db_photo = WorkshopPhoto(**photo.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo


@router.put("/workshop-photos/{photo_id}", response_model=WorkshopPhotoSchema)
def update_workshop_photo(
    photo_id: int,
    photo_update: WorkshopPhotoUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    photo = db.query(WorkshopPhoto).filter(
        WorkshopPhoto.id == photo_id,
        WorkshopPhoto.tenant_id == current_user.tenant_id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Workshop photo not found")
    for field, value in photo_update.model_dump(exclude_unset=True).items():
        setattr(photo, field, value)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/workshop-photos/{photo_id}")
def delete_workshop_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    photo = db.query(WorkshopPhoto).filter(
        WorkshopPhoto.id == photo_id,
        WorkshopPhoto.tenant_id == current_user.tenant_id,
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Workshop photo not found")
    db.delete(photo)
    db.commit()
    return {"message": "Workshop photo deleted successfully"}
