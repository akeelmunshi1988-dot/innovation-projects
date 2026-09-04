from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.models import HomepageEnquiry, StaffUser
from app.schemas.schemas import HomepageEnquiry as HomepageEnquirySchema


router = APIRouter()


def _tenant_enquiry(db: Session, enquiry_id: int, tenant_id: int) -> HomepageEnquiry:
    enquiry = (
        db.query(HomepageEnquiry)
        .filter(HomepageEnquiry.id == enquiry_id, HomepageEnquiry.tenant_id == tenant_id)
        .first()
    )
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return enquiry


@router.get("/homepage-enquiries", response_model=List[HomepageEnquirySchema])
def list_homepage_enquiries(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(HomepageEnquiry)
        .filter(HomepageEnquiry.tenant_id == current_user.tenant_id)
        .order_by(HomepageEnquiry.created_at.desc())
        .all()
    )


@router.patch("/homepage-enquiries/{enquiry_id}/read", response_model=HomepageEnquirySchema)
def mark_homepage_enquiry_read(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    enquiry = _tenant_enquiry(db, enquiry_id, current_user.tenant_id)
    enquiry.is_read = True
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.delete("/homepage-enquiries/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_homepage_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    enquiry = _tenant_enquiry(db, enquiry_id, current_user.tenant_id)
    db.delete(enquiry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
