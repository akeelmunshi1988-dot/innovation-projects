from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import StaffUser, Customer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_customer_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/customer/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> StaffUser:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")
        if user_id is None or token_type == "customer":
            raise credentials_error
    except JWTError:
        raise credentials_error

    user = db.query(StaffUser).filter(
        StaffUser.id == int(user_id),
        StaffUser.is_active == True,
    ).first()
    if user is None:
        raise credentials_error
    return user


def get_current_customer(
    token: str = Depends(oauth2_customer_scheme),
    db: Session = Depends(get_db),
) -> Customer:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        token_type: Optional[str] = payload.get("type")
        if user_id is None or token_type != "customer":
            raise credentials_error
    except JWTError:
        raise credentials_error

    customer = db.query(Customer).filter(
        Customer.id == int(user_id),
        Customer.is_active == True,
    ).first()
    if customer is None:
        raise credentials_error
    return customer
