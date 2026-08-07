import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.models.models import Testimonial, StaffUser
from app.schemas.schemas import TestimonialCreate, TestimonialUpdate, Testimonial as TestimonialSchema

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "testimonials")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_MB = 20

router = APIRouter()


@router.post("/testimonials/upload-image")
async def upload_testimonial_image(
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

    return JSONResponse({"url": f"/static/testimonials/{filename}"})


@router.get("/testimonials", response_model=List[TestimonialSchema])
def get_testimonials(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(Testimonial)
        .filter(Testimonial.tenant_id == current_user.tenant_id)
        .order_by(Testimonial.sort_order.asc(), Testimonial.id.asc())
        .all()
    )


@router.post("/testimonials", response_model=TestimonialSchema)
def create_testimonial(
    testimonial: TestimonialCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    db_testimonial = Testimonial(**testimonial.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_testimonial)
    db.commit()
    db.refresh(db_testimonial)
    cache_clear("testimonials")
    return db_testimonial


@router.put("/testimonials/{testimonial_id}", response_model=TestimonialSchema)
def update_testimonial(
    testimonial_id: int,
    testimonial_update: TestimonialUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    testimonial = db.query(Testimonial).filter(
        Testimonial.id == testimonial_id,
        Testimonial.tenant_id == current_user.tenant_id,
    ).first()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    for field, value in testimonial_update.model_dump(exclude_unset=True).items():
        setattr(testimonial, field, value)
    db.commit()
    db.refresh(testimonial)
    cache_clear("testimonials")
    return testimonial


@router.delete("/testimonials/{testimonial_id}")
def delete_testimonial(
    testimonial_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    testimonial = db.query(Testimonial).filter(
        Testimonial.id == testimonial_id,
        Testimonial.tenant_id == current_user.tenant_id,
    ).first()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    db.delete(testimonial)
    db.commit()
    cache_clear("testimonials")
    return {"message": "Testimonial deleted successfully"}
