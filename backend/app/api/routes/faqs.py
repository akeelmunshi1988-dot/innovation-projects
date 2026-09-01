from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.core.database import get_db
from app.models.models import FAQ, RugCatalog, StaffUser, Tenant

router = APIRouter()


class FAQBody(BaseModel):
    question: str = Field(..., min_length=2, max_length=500)
    answer: str = Field(..., min_length=2, max_length=10000)
    rug_catalog_id: Optional[int] = None
    sort_order: int = Field(0, ge=0, le=10000)
    is_active: bool = True


class FAQUpdate(BaseModel):
    question: Optional[str] = Field(None, min_length=2, max_length=500)
    answer: Optional[str] = Field(None, min_length=2, max_length=10000)
    rug_catalog_id: Optional[int] = None
    sort_order: Optional[int] = Field(None, ge=0, le=10000)
    is_active: Optional[bool] = None


class FAQOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question: str
    answer: str
    rug_catalog_id: Optional[int]
    sort_order: int
    is_active: bool


def _validate_rug(db: Session, tenant_id: int, rug_id: Optional[int]) -> None:
    if rug_id is not None and not db.query(RugCatalog.id).filter(
        RugCatalog.id == rug_id, RugCatalog.tenant_id == tenant_id
    ).first():
        raise HTTPException(status_code=422, detail="Selected catalog rug does not exist.")


@router.get("/faqs", response_model=List[FAQOut])
def list_faqs(db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    return db.query(FAQ).filter(FAQ.tenant_id == current_user.tenant_id).order_by(FAQ.sort_order, FAQ.id).all()


@router.post("/faqs", response_model=FAQOut)
def create_faq(body: FAQBody, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    _validate_rug(db, current_user.tenant_id, body.rug_catalog_id)
    item = FAQ(**body.model_dump(), tenant_id=current_user.tenant_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    cache_clear("faqs")
    return item


@router.put("/faqs/{faq_id}", response_model=FAQOut)
def update_faq(faq_id: int, body: FAQUpdate, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    item = db.query(FAQ).filter(FAQ.id == faq_id, FAQ.tenant_id == current_user.tenant_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="FAQ not found")
    values = body.model_dump(exclude_unset=True)
    if "rug_catalog_id" in values:
        _validate_rug(db, current_user.tenant_id, values["rug_catalog_id"])
    for field, value in values.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    cache_clear("faqs")
    return item


@router.delete("/faqs/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db), current_user: StaffUser = Depends(get_current_user)):
    item = db.query(FAQ).filter(FAQ.id == faq_id, FAQ.tenant_id == current_user.tenant_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="FAQ not found")
    db.delete(item)
    db.commit()
    cache_clear("faqs")
    return {"message": "FAQ deleted"}


@router.get("/customer/faqs", response_model=List[FAQOut])
def public_faqs(rug_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.is_active.is_(True)).first()
    if not tenant:
        return []
    query = db.query(FAQ).filter(FAQ.tenant_id == tenant.id, FAQ.is_active.is_(True))
    if rug_id is None:
        query = query.filter(FAQ.rug_catalog_id.is_(None))
    else:
        query = query.filter(or_(FAQ.rug_catalog_id.is_(None), FAQ.rug_catalog_id == rug_id))
    return query.order_by(FAQ.sort_order, FAQ.id).all()
