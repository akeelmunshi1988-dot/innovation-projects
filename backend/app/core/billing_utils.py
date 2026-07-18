from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.models import Tenant, StaffUser

PLAN_CREDITS = {
    "starter": 200,
    "growth": 1000,
    "pro": -1,  # unlimited
}


def check_and_consume_ai_credit(
    current_user: StaffUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StaffUser:
    """Dependency: verifies AI credit quota and increments usage counter."""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    limit = PLAN_CREDITS.get(tenant.plan, 200)
    used = tenant.ai_credits_used or 0

    if limit != -1 and used >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "AI_CREDITS_EXHAUSTED",
                "message": f"You've used all {limit} AI queries for this month. Upgrade your plan for more.",
                "used": used,
                "limit": limit,
            },
        )

    tenant.ai_credits_used = used + 1
    db.commit()
    return current_user
