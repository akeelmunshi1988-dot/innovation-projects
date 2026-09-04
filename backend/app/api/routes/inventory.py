from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.cache import cache_clear
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


def create_material_row(db: Session, data: dict, tenant_id: int) -> Material:
    """Shared by POST /inventory and the AI-assistant confirm endpoint
    (app/api/routes/chat.py) so both paths create a material identically."""
    from app.models.models import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    data = dict(data)
    data["cost_currency"] = data.get("cost_currency") or (tenant.base_currency if tenant else None)
    db_material = Material(**data, tenant_id=tenant_id)
    db.add(db_material)
    db.commit()
    cache_clear("settings")  # storefront "Materials" stat counts available materials
    db.refresh(db_material)
    return db_material


def update_material_row(db: Session, material: Material, updates: dict) -> Material:
    for field, value in updates.items():
        setattr(material, field, value)
    db.commit()
    cache_clear("settings")  # storefront "Materials" stat counts available materials
    db.refresh(material)
    return material


def delete_material_row(db: Session, material: Material) -> None:
    try:
        db.delete(material)
        db.commit()
        cache_clear("settings")  # storefront "Materials" stat counts available materials
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: this material is used by one or more rugs. Remove it from the catalog first.",
        )


@router.post("/inventory", response_model=MaterialSchema)
def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return create_material_row(db, material.model_dump(), current_user.tenant_id)


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
    return update_material_row(db, material, material_update.model_dump(exclude_unset=True))


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
    delete_material_row(db, material)


def restock_material_row(db: Session, material: Material, qty_meters: float, tenant_id: int, notes: Optional[str] = None) -> Material:
    """Shared by POST /inventory/{id}/restock and the public API
    (app/api/routes/public_api.py) so both paths restock identically."""
    if qty_meters <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    material.stock_meters += qty_meters
    material.is_available = True

    transaction = InventoryTransaction(
        material_id=material.id,
        tenant_id=tenant_id,
        qty_change=qty_meters,
        transaction_type="restock",
        notes=notes or f"Restocked {qty_meters} meters",
    )
    db.add(transaction)
    db.commit()
    cache_clear("settings")  # restock flips is_available -> True; storefront "Materials" stat counts available materials
    db.refresh(material)
    return material


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
    return restock_material_row(db, material, qty_meters, current_user.tenant_id, notes)


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
