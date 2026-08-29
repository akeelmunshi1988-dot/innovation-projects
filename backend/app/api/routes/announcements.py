from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.models.models import AnnouncementMessage, StaffUser
from app.schemas.schemas import AnnouncementMessageCreate, AnnouncementMessageUpdate, AnnouncementMessage as AnnouncementMessageSchema

router = APIRouter()


@router.get("/announcements", response_model=List[AnnouncementMessageSchema])
def get_announcements(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(AnnouncementMessage)
        .filter(AnnouncementMessage.tenant_id == current_user.tenant_id)
        .order_by(AnnouncementMessage.sort_order.asc(), AnnouncementMessage.id.asc())
        .all()
    )


@router.post("/announcements", response_model=AnnouncementMessageSchema)
def create_announcement(
    announcement: AnnouncementMessageCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    db_announcement = AnnouncementMessage(**announcement.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    cache_clear("announcements")
    return db_announcement


@router.put("/announcements/{announcement_id}", response_model=AnnouncementMessageSchema)
def update_announcement(
    announcement_id: int,
    announcement_update: AnnouncementMessageUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    announcement = db.query(AnnouncementMessage).filter(
        AnnouncementMessage.id == announcement_id,
        AnnouncementMessage.tenant_id == current_user.tenant_id,
    ).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    for field, value in announcement_update.model_dump(exclude_unset=True).items():
        setattr(announcement, field, value)
    db.commit()
    db.refresh(announcement)
    cache_clear("announcements")
    return announcement


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    announcement = db.query(AnnouncementMessage).filter(
        AnnouncementMessage.id == announcement_id,
        AnnouncementMessage.tenant_id == current_user.tenant_id,
    ).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(announcement)
    db.commit()
    cache_clear("announcements")
    return {"message": "Announcement deleted successfully"}
