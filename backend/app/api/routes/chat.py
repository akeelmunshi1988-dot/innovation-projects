from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.ai_agent import AIAgent
from app.core.billing_utils import check_and_consume_ai_credit
from app.models.models import StaffUser
from app.core.database import get_db

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: StaffUser = Depends(check_and_consume_ai_credit),
    db: Session = Depends(get_db),
):
    try:
        agent = AIAgent()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        result = agent.chat(messages, request.session_id)
        return ChatResponse(response=result["response"], session_id=result["session_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI agent error: {str(e)}")
