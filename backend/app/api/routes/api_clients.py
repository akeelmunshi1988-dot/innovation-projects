from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import generate_api_key, get_current_user
from app.core.database import get_db
from app.models.models import ApiClient, StaffUser
from app.schemas.schemas import ApiClientCreate, ApiClient as ApiClientSchema, ApiClientCreated

router = APIRouter()


@router.get("/api-clients", response_model=List[ApiClientSchema])
def list_api_clients(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(ApiClient)
        .filter(ApiClient.tenant_id == current_user.tenant_id, ApiClient.revoked_at.is_(None))
        .order_by(ApiClient.created_at.desc())
        .all()
    )


@router.post("/api-clients", response_model=ApiClientCreated)
def create_api_client(
    body: ApiClientCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    raw_key, key_hash, key_prefix = generate_api_key()
    client = ApiClient(
        tenant_id=current_user.tenant_id,
        name=body.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return ApiClientCreated(
        id=client.id, name=client.name, key_prefix=client.key_prefix,
        is_active=client.is_active, created_at=client.created_at, last_used_at=client.last_used_at,
        api_key=raw_key,
    )


@router.delete("/api-clients/{client_id}")
def revoke_api_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    from datetime import datetime, timezone
    client = db.query(ApiClient).filter(
        ApiClient.id == client_id, ApiClient.tenant_id == current_user.tenant_id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="API client not found")
    client.is_active = False
    client.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "API key revoked"}
