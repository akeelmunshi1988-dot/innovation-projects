from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import EmailTemplate, StaffUser
from app.schemas.schemas import EmailTemplate as EmailTemplateSchema, EmailTemplateUpdate
from app.services.email_service import DEFAULT_TEMPLATES, seed_default_templates

router = APIRouter()


@router.get("/email-templates", response_model=List[EmailTemplateSchema])
def list_email_templates(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    seed_default_templates(db, current_user.tenant_id)
    return (
        db.query(EmailTemplate)
        .filter(EmailTemplate.tenant_id == current_user.tenant_id)
        .order_by(EmailTemplate.key)
        .all()
    )


@router.put("/email-templates/{key}", response_model=EmailTemplateSchema)
def update_email_template(
    key: str,
    body: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    if key not in DEFAULT_TEMPLATES:
        raise HTTPException(status_code=404, detail=f"Unknown template key '{key}'")

    seed_default_templates(db, current_user.tenant_id)
    template = db.query(EmailTemplate).filter(
        EmailTemplate.tenant_id == current_user.tenant_id,
        EmailTemplate.key == key,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template
