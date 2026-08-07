from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import PromoCode, PromoRedemption, StaffUser
from app.schemas.schemas import PromoCodeCreate, PromoCodeUpdate, PromoCode as PromoCodeSchema

router = APIRouter()


def _with_used_count(db: Session, promo: PromoCode) -> PromoCode:
    promo.used_count = db.query(sqlfunc.count(PromoRedemption.id)).filter(PromoRedemption.promo_code_id == promo.id).scalar()
    return promo


@router.get("/promo-codes", response_model=List[PromoCodeSchema])
def get_promo_codes(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    promos = (
        db.query(PromoCode)
        .filter(PromoCode.tenant_id == current_user.tenant_id)
        .order_by(PromoCode.created_at.desc())
        .all()
    )
    return [_with_used_count(db, p) for p in promos]


@router.post("/promo-codes", response_model=PromoCodeSchema)
def create_promo_code(
    body: PromoCodeCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    normalized = body.code.strip().upper()
    existing = db.query(PromoCode).filter(
        PromoCode.tenant_id == current_user.tenant_id, PromoCode.code == normalized,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f'A promo code "{normalized}" already exists.')

    data = body.model_dump()
    data["code"] = normalized
    promo = PromoCode(**data, tenant_id=current_user.tenant_id)
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return _with_used_count(db, promo)


@router.put("/promo-codes/{promo_id}", response_model=PromoCodeSchema)
def update_promo_code(
    promo_id: int,
    body: PromoCodeUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    promo = db.query(PromoCode).filter(
        PromoCode.id == promo_id, PromoCode.tenant_id == current_user.tenant_id,
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    updates = body.model_dump(exclude_unset=True)
    if "code" in updates:
        normalized = updates["code"].strip().upper()
        dupe = db.query(PromoCode).filter(
            PromoCode.tenant_id == current_user.tenant_id, PromoCode.code == normalized, PromoCode.id != promo_id,
        ).first()
        if dupe:
            raise HTTPException(status_code=400, detail=f'A promo code "{normalized}" already exists.')
        updates["code"] = normalized

    for field, value in updates.items():
        setattr(promo, field, value)
    db.commit()
    db.refresh(promo)
    return _with_used_count(db, promo)


@router.delete("/promo-codes/{promo_id}")
def delete_promo_code(
    promo_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    promo = db.query(PromoCode).filter(
        PromoCode.id == promo_id, PromoCode.tenant_id == current_user.tenant_id,
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    db.delete(promo)
    db.commit()
    return {"message": "Promo code deleted successfully"}
