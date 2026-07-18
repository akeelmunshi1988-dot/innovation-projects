from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import Customer, Quote, StaffUser
from app.schemas.schemas import (
    CustomerCreate,
    CustomerUpdate,
    Customer as CustomerSchema,
    Quote as QuoteSchema,
)

router = APIRouter()


@router.get("/customers", response_model=List[CustomerSchema])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    return db.query(Customer).filter(
        Customer.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit).all()


@router.get("/customers/{customer_id}", response_model=CustomerSchema)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/customers/{customer_id}/quotes", response_model=List[QuoteSchema])
def get_customer_quotes(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db.query(Quote).filter(
        Quote.customer_id == customer_id,
        Quote.tenant_id == current_user.tenant_id,
    ).all()


@router.post("/customers", response_model=CustomerSchema)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    existing = db.query(Customer).filter(
        Customer.email == customer.email,
        Customer.tenant_id == current_user.tenant_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this email already exists")
    db_customer = Customer(**customer.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.put("/customers/{customer_id}", response_model=CustomerSchema)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer_update.email:
        existing = db.query(Customer).filter(
            Customer.email == customer_update.email,
            Customer.tenant_id == current_user.tenant_id,
            Customer.id != customer_id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    for field, value in customer_update.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.tenant_id == current_user.tenant_id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"}
