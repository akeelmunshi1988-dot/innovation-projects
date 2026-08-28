from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.schemas.schemas import ChatRequest, ChatResponse, PendingAiAction as PendingAiActionSchema, AiChatMessage as AiChatMessageSchema
from app.services.ai_agent import AIAgent
from app.core.billing_utils import check_and_consume_ai_credit
from app.core.auth import get_current_user
from app.models.models import StaffUser, PendingAiAction, RugCatalog, Material, PromoCode, AiChatMessage
from app.core.database import get_db
from app.api.routes.catalog import create_rug_row, update_rug_row, delete_rug_row, add_rug_image_row
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

        # The frontend resends the full conversation every turn, so only persist
        # this turn's new user message + the assistant's reply — not the whole
        # history again, which is already stored from earlier turns.
        if messages and messages[-1]["role"] == "user":
            db.add(AiChatMessage(
                tenant_id=current_user.tenant_id, session_id=result["session_id"],
                staff_id=current_user.id, role="user", content=messages[-1]["content"],
            ))
        db.add(AiChatMessage(
            tenant_id=current_user.tenant_id, session_id=result["session_id"],
            staff_id=current_user.id, role="assistant", content=result["response"],
        ))
        db.commit()

        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"],
            pending_actions=result.get("pending_actions", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI agent error: {str(e)}")


@router.get("/chat/history", response_model=List[AiChatMessageSchema])
def get_chat_history(
    session_id: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Past AI Assistant conversation turns for this tenant — for future
    reference. Pass session_id to fetch one conversation; omit it to get the
    most recent messages across all sessions."""
    query = db.query(AiChatMessage).filter(AiChatMessage.tenant_id == current_user.tenant_id)
    if session_id:
        query = query.filter(AiChatMessage.session_id == session_id)
    return query.order_by(AiChatMessage.created_at.desc()).limit(min(limit, 1000)).all()


@router.get("/chat/sessions")
def list_chat_sessions(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    """Distinct past conversations for this tenant, most recent first, with a
    preview of the first message in each — for a history/browse UI."""
    from sqlalchemy import func as sqlfunc
    sessions = (
        db.query(
            AiChatMessage.session_id,
            sqlfunc.min(AiChatMessage.created_at).label("started_at"),
            sqlfunc.max(AiChatMessage.created_at).label("last_message_at"),
            sqlfunc.count(AiChatMessage.id).label("message_count"),
        )
        .filter(AiChatMessage.tenant_id == current_user.tenant_id, AiChatMessage.session_id.isnot(None))
        .group_by(AiChatMessage.session_id)
        .order_by(sqlfunc.max(AiChatMessage.created_at).desc())
        .limit(100)
        .all()
    )
    result = []
    for s in sessions:
        first_user_msg = (
            db.query(AiChatMessage)
            .filter(AiChatMessage.tenant_id == current_user.tenant_id, AiChatMessage.session_id == s.session_id, AiChatMessage.role == "user")
            .order_by(AiChatMessage.created_at.asc())
            .first()
        )
        result.append({
            "session_id": s.session_id,
            "started_at": s.started_at,
            "last_message_at": s.last_message_at,
            "message_count": s.message_count,
            "preview": (first_user_msg.content[:120] if first_user_msg else ""),
        })
    return result


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
        payload = dict(action.payload)
        gallery_urls = payload.pop("_gallery_image_urls", None) or []

        if action.action_type == "create":
            rug = create_rug_row(db, payload, tenant_id)
            for url in gallery_urls:
                add_rug_image_row(db, rug.id, url)
        else:
            rug = db.query(RugCatalog).filter(RugCatalog.id == action.entity_id, RugCatalog.tenant_id == tenant_id).first()
            if not rug:
                raise HTTPException(status_code=404, detail="The rug this action targets no longer exists.")
            if action.action_type == "update":
                update_rug_row(db, rug, payload)
                for url in gallery_urls:
                    add_rug_image_row(db, rug.id, url)
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
