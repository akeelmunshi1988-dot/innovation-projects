from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Material, InventoryTransaction, StaffUser
from app.schemas.schemas import (
    Material as MaterialSchema,
    MaterialCreate,
    MaterialUpdate,
    InventoryTransaction as InventoryTransactionSchema,
)

router = APIRouter()

LOW_STOCK_THRESHOLD = 50.0


@router.get("/inventory", response_model=List[MaterialSchema])
def get_inventory(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return db.query(Material).filter(Material.tenant_id == current_user.tenant_id).all()


@router.get("/inventory/low-stock", response_model=List[MaterialSchema])
def get_low_stock(
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return db.query(Material).filter(
        Material.tenant_id == current_user.tenant_id,
        Material.stock_meters < LOW_STOCK_THRESHOLD,
    ).all()


@router.get("/inventory/{material_id}", response_model=MaterialSchema)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.tenant_id == current_user.tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.post("/inventory", response_model=MaterialSchema)
def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    data = material.model_dump()
    data['cost_currency'] = data.get('cost_currency') or current_user.tenant.base_currency
    db_material = Material(**data, tenant_id=current_user.tenant_id)
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    return db_material


@router.put("/inventory/{material_id}", response_model=MaterialSchema)
def update_material(
    material_id: int,
    material_update: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.tenant_id == current_user.tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, value in material_update.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/inventory/{material_id}", status_code=204)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.tenant_id == current_user.tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    try:
        db.delete(material)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: this material is used by one or more rugs. Remove it from the catalog first.",
        )


@router.post("/inventory/{material_id}/restock", response_model=MaterialSchema)
def restock_material(
    material_id: int,
    qty_meters: float,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.tenant_id == current_user.tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if qty_meters <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    material.stock_meters += qty_meters
    material.is_available = True

    transaction = InventoryTransaction(
        material_id=material_id,
        tenant_id=current_user.tenant_id,
        qty_change=qty_meters,
        transaction_type="restock",
        notes=notes or f"Restocked {qty_meters} meters",
    )
    db.add(transaction)
    db.commit()
    db.refresh(material)
    return material


@router.get("/inventory/{material_id}/transactions", response_model=List[InventoryTransactionSchema])
def get_transactions(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.tenant_id == current_user.tenant_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.material_id == material_id,
            InventoryTransaction.tenant_id == current_user.tenant_id,
        )
        .order_by(InventoryTransaction.created_at.desc())
        .all()
    )
