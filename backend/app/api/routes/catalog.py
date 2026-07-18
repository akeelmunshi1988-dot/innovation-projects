import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import RugCatalog, Material, StaffUser
from app.schemas.schemas import RugCatalogCreate, RugCatalogUpdate, RugCatalog as RugCatalogSchema

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "rugs")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 5

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
    db_rug = RugCatalog(**data, tenant_id=current_user.tenant_id)
    db.add(db_rug)
    db.commit()
    db.refresh(db_rug)
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
    return {"message": "Rug deleted successfully"}
