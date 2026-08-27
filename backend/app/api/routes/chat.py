from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.schemas.schemas import ChatRequest, ChatResponse, PendingAiAction as PendingAiActionSchema
from app.services.ai_agent import AIAgent
from app.core.billing_utils import check_and_consume_ai_credit
from app.core.auth import get_current_user
from app.models.models import StaffUser, PendingAiAction, RugCatalog, Material, PromoCode
from app.core.database import get_db
from app.api.routes.catalog import create_rug_row, update_rug_row, delete_rug_row
from app.api.routes.inventory import create_material_row, update_material_row, delete_material_row
from app.api.routes.promo_codes import create_promo_row, update_promo_row, delete_promo_row

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: StaffUser = Depends(check_and_consume_ai_credit),
    db: Session = Depends(get_db),
):
    try:
        agent = AIAgent(tenant_id=current_user.tenant_id, staff_id=current_user.id)  # type: ignore[arg-type]
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        result = agent.chat(messages, request.session_id)
        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"],
            pending_actions=result.get("pending_actions", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI agent error: {str(e)}")


def _find_pending_action(db: Session, action_id: int, tenant_id: int) -> PendingAiAction:
    action = db.query(PendingAiAction).filter(
        PendingAiAction.id == action_id,
        PendingAiAction.tenant_id == tenant_id,
    ).first()
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")
    if action.status != "pending":
        raise HTTPException(status_code=400, detail=f"This action is already '{action.status}'.")
    return action


@router.get("/chat/pending-actions", response_model=List[PendingAiActionSchema])
def list_pending_actions(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(PendingAiAction)
        .filter(PendingAiAction.tenant_id == current_user.tenant_id, PendingAiAction.status == "pending")
        .order_by(PendingAiAction.created_at.desc())
        .all()
    )


@router.post("/chat/pending-actions/{action_id}/confirm", response_model=PendingAiActionSchema)
def confirm_pending_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Executes the staged write via the exact same helper the normal admin
    route uses (see catalog.py/inventory.py/promo_codes.py) — an AI-confirmed
    write and a human-typed one can never diverge in behavior."""
    action = _find_pending_action(db, action_id, current_user.tenant_id)
    tenant_id = current_user.tenant_id

    if action.entity_type == "rug_catalog":
        if action.action_type == "create":
            create_rug_row(db, action.payload, tenant_id)
        else:
            rug = db.query(RugCatalog).filter(RugCatalog.id == action.entity_id, RugCatalog.tenant_id == tenant_id).first()
            if not rug:
                raise HTTPException(status_code=404, detail="The rug this action targets no longer exists.")
            if action.action_type == "update":
                update_rug_row(db, rug, action.payload)
            else:
                delete_rug_row(db, rug)

    elif action.entity_type == "material":
        if action.action_type == "create":
            create_material_row(db, action.payload, tenant_id)
        else:
            material = db.query(Material).filter(Material.id == action.entity_id, Material.tenant_id == tenant_id).first()
            if not material:
                raise HTTPException(status_code=404, detail="The material this action targets no longer exists.")
            if action.action_type == "update":
                update_material_row(db, material, action.payload)
            else:
                delete_material_row(db, material)

    elif action.entity_type == "promo_code":
        if action.action_type == "create":
            create_promo_row(db, action.payload, tenant_id)
        else:
            promo = db.query(PromoCode).filter(PromoCode.id == action.entity_id, PromoCode.tenant_id == tenant_id).first()
            if not promo:
                raise HTTPException(status_code=404, detail="The promo code this action targets no longer exists.")
            if action.action_type == "update":
                update_promo_row(db, promo, action.payload, tenant_id)
            else:
                delete_promo_row(db, promo)

    else:
        raise HTTPException(status_code=400, detail=f"Unknown entity_type: {action.entity_type}")

    action.status = "confirmed"
    action.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    return action


@router.post("/chat/pending-actions/{action_id}/reject", response_model=PendingAiActionSchema)
def reject_pending_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    action = _find_pending_action(db, action_id, current_user.tenant_id)
    action.status = "rejected"
    action.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    return action
