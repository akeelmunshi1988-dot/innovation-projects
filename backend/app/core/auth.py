import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import StaffUser, Customer, RefreshToken

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


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def create_refresh_token(db: Session, user_type: str, user_id: int) -> str:
    """Issue a new refresh token, storing only its hash. Returns the raw token — the only time it exists in plaintext."""
    raw_token = secrets.token_urlsafe(48)
    row = RefreshToken(
        user_type=user_type,
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(row)
    db.commit()
    return raw_token


def rotate_refresh_token(db: Session, raw_token: str) -> Tuple[str, int, str]:
    """
    Verify a refresh token and rotate it: the presented token is revoked and a
    new one issued in its place. Returns (user_type, user_id, new_raw_token).

    If the presented token was already revoked, it means someone is replaying
    an old, rotated-out token — a signal the token was stolen and used after
    the legitimate client already rotated past it. Every refresh token for
    that user is revoked in response, forcing a full re-login everywhere.
    """
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    row = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(raw_token)).first()
    if row is None or row.expires_at < datetime.utcnow():
        raise credentials_error

    if row.revoked_at is not None:
        db.query(RefreshToken).filter(
            RefreshToken.user_type == row.user_type,
            RefreshToken.user_id == row.user_id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": datetime.utcnow()})
        db.commit()
        raise credentials_error

    row.revoked_at = datetime.utcnow()
    new_raw_token = secrets.token_urlsafe(48)
    new_row = RefreshToken(
        user_type=row.user_type,
        user_id=row.user_id,
        token_hash=_hash_token(new_raw_token),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_row)
    db.flush()
    row.replaced_by_id = new_row.id
    db.commit()

    return row.user_type, row.user_id, new_raw_token


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(raw_token)).first()
    if row is not None and row.revoked_at is None:
        row.revoked_at = datetime.utcnow()
        db.commit()


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
