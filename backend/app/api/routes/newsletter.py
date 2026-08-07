import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import NewsletterSubscriber, StaffUser
from app.schemas.schemas import NewsletterSubscriber as NewsletterSubscriberSchema

router = APIRouter()


@router.get("/newsletter-subscribers", response_model=List[NewsletterSubscriberSchema])
def get_newsletter_subscribers(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(NewsletterSubscriber)
        .filter(NewsletterSubscriber.tenant_id == current_user.tenant_id)
        .order_by(NewsletterSubscriber.subscribed_at.desc())
        .all()
    )


@router.get("/newsletter-subscribers/export")
def export_newsletter_subscribers(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    subscribers = (
        db.query(NewsletterSubscriber)
        .filter(NewsletterSubscriber.tenant_id == current_user.tenant_id)
        .order_by(NewsletterSubscriber.subscribed_at.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Email", "Source", "Subscribed At"])
    for s in subscribers:
        writer.writerow([s.email, s.source or "", s.subscribed_at])
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=newsletter_subscribers.csv"},
    )
