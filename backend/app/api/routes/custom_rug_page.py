import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.cache import cache_clear, cache_get, cache_set
from app.core.database import SessionLocal, get_db
from app.models.models import CustomRugPageImage, StaffUser, Tenant
from app.schemas.schemas import (
    CustomRugPageImage as CustomRugPageImageSchema,
    CustomRugPageImageCreate,
    CustomRugPageImageUpdate,
)


router = APIRouter()
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "custom-rug-page")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_MB = 20
MAX_PAGE_IMAGES = 10


@router.post("/custom-rug-page-images/upload")
async def upload_custom_rug_page_image(
    file: UploadFile = File(...),
    current_user: StaffUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Use a JPEG, PNG, or WebP image.")
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_IMAGE_SIZE_MB}MB.")
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{extension}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as image_file:
        image_file.write(contents)
    return JSONResponse({"url": f"/static/custom-rug-page/{filename}"})


@router.get("/custom-rug-page-images", response_model=List[CustomRugPageImageSchema])
def list_custom_rug_page_images(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(CustomRugPageImage)
        .filter(CustomRugPageImage.tenant_id == current_user.tenant_id)
        .order_by(CustomRugPageImage.sort_order.asc(), CustomRugPageImage.id.asc())
        .all()
    )


@router.post("/custom-rug-page-images", response_model=CustomRugPageImageSchema)
def create_custom_rug_page_image(
    body: CustomRugPageImageCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    count = db.query(CustomRugPageImage).filter(CustomRugPageImage.tenant_id == current_user.tenant_id).count()
    if count >= MAX_PAGE_IMAGES:
        raise HTTPException(status_code=409, detail="A maximum of 10 grid images is allowed.")
    image = CustomRugPageImage(**body.model_dump(), tenant_id=current_user.tenant_id)
    db.add(image)
    db.commit()
    db.refresh(image)
    cache_clear("custom_rug_page_images")
    return image


@router.put("/custom-rug-page-images/{image_id}", response_model=CustomRugPageImageSchema)
def update_custom_rug_page_image(
    image_id: int,
    body: CustomRugPageImageUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = db.query(CustomRugPageImage).filter(
        CustomRugPageImage.id == image_id,
        CustomRugPageImage.tenant_id == current_user.tenant_id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Grid image not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(image, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(image)
    cache_clear("custom_rug_page_images")
    return image


@router.delete("/custom-rug-page-images/{image_id}")
def delete_custom_rug_page_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    image = db.query(CustomRugPageImage).filter(
        CustomRugPageImage.id == image_id,
        CustomRugPageImage.tenant_id == current_user.tenant_id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Grid image not found")
    db.delete(image)
    db.commit()
    cache_clear("custom_rug_page_images")
    return {"ok": True}


@router.get("/customer/custom-rug-page-images")
def public_custom_rug_page_images():
    cached = cache_get("custom_rug_page_images")
    if cached is not None:
        return cached
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        if not tenant:
            return []
        images = db.query(CustomRugPageImage).filter(
            CustomRugPageImage.tenant_id == tenant.id,
            CustomRugPageImage.is_active == True,
        ).order_by(CustomRugPageImage.sort_order.asc(), CustomRugPageImage.id.asc()).limit(MAX_PAGE_IMAGES).all()
        result = [{"id": image.id, "title": image.title, "image_url": image.image_url} for image in images]
        cache_set("custom_rug_page_images", result)
        return result
    finally:
        db.close()
