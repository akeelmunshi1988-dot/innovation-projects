from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.models import TradeEnquiry, StaffUser
from app.schemas.schemas import TradeEnquiry as TradeEnquirySchema


router = APIRouter()


def _tenant_enquiry(db: Session, enquiry_id: int, tenant_id: int) -> TradeEnquiry:
    enquiry = (
        db.query(TradeEnquiry)
        .filter(TradeEnquiry.id == enquiry_id, TradeEnquiry.tenant_id == tenant_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return enquiry


@router.get("/trade-enquiries", response_model=List[TradeEnquirySchema])
def list_trade_enquiries(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(TradeEnquiry)
        .filter(TradeEnquiry.tenant_id == current_user.tenant_id)
        .order_by(TradeEnquiry.created_at.desc())
        .all()
    )


@router.patch("/trade-enquiries/{enquiry_id}/read", response_model=TradeEnquirySchema)
def mark_trade_enquiry_read(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    enquiry = _tenant_enquiry(db, enquiry_id, current_user.tenant_id)
    enquiry.is_read = True
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.delete("/trade-enquiries/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trade_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    enquiry = _tenant_enquiry(db, enquiry_id, current_user.tenant_id)
    db.delete(enquiry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
