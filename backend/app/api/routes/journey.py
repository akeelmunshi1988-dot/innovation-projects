from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
from app.models.models import RugJourneyStep, StaffUser
from app.schemas.schemas import RugJourneyStepCreate, RugJourneyStepUpdate, RugJourneyStep as RugJourneyStepSchema

router = APIRouter()


@router.get("/journey-steps", response_model=List[RugJourneyStepSchema])
def get_journey_steps(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return (
        db.query(RugJourneyStep)
        .filter(RugJourneyStep.tenant_id == current_user.tenant_id)
        .order_by(RugJourneyStep.sort_order.asc(), RugJourneyStep.id.asc())
        .all()
    )


@router.post("/journey-steps", response_model=RugJourneyStepSchema)
def create_journey_step(
    step: RugJourneyStepCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    db_step = RugJourneyStep(**step.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_step)
    db.commit()
    db.refresh(db_step)
    cache_clear("journey_steps")
    return db_step


@router.put("/journey-steps/{step_id}", response_model=RugJourneyStepSchema)
def update_journey_step(
    step_id: int,
    step_update: RugJourneyStepUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    step = db.query(RugJourneyStep).filter(
        RugJourneyStep.id == step_id,
        RugJourneyStep.tenant_id == current_user.tenant_id,
    ).first()
    if not step:
        raise HTTPException(status_code=404, detail="Journey step not found")
    for field, value in step_update.model_dump(exclude_unset=True).items():
        setattr(step, field, value)
    db.commit()
    db.refresh(step)
    cache_clear("journey_steps")
    return step


@router.delete("/journey-steps/{step_id}")
def delete_journey_step(
    step_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    step = db.query(RugJourneyStep).filter(
        RugJourneyStep.id == step_id,
        RugJourneyStep.tenant_id == current_user.tenant_id,
    ).first()
    if not step:
        raise HTTPException(status_code=404, detail="Journey step not found")
    db.delete(step)
    db.commit()
    cache_clear("journey_steps")
    return {"message": "Journey step deleted successfully"}
