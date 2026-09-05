from fastapi import Depends, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import jwt

from app.core.database import get_db
from app.core.security import decode_token
from app.repositories import user_repo
from app.models.user import User
from app.middleware.error_handler import AppError

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not auth or not auth.credentials:
        raise AppError(
            code="UNAUTHORIZED",
            message="Authentication credentials were not provided.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

    token = auth.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise AppError("INVALID_TOKEN", "Access token required.", status.HTTP_401_UNAUTHORIZED)
        user_id = payload.get("sub")
        if not user_id:
            raise AppError("INVALID_TOKEN", "Malformed token payload.", status.HTTP_401_UNAUTHORIZED)
    except jwt.ExpiredSignatureError:
        raise AppError("TOKEN_EXPIRED", "Access token has expired.", status.HTTP_401_UNAUTHORIZED)
    except Exception:
        raise AppError("INVALID_TOKEN", "Invalid authentication token.", status.HTTP_401_UNAUTHORIZED)

    user = user_repo.get_by_id(db, user_id)
    if not user:
        raise AppError("USER_NOT_FOUND", "User account does not exist.", status.HTTP_401_UNAUTHORIZED)

    if user.account_status == "suspended":
        raise AppError("ACCOUNT_SUSPENDED", "Account is suspended.", status.HTTP_403_FORBIDDEN)

    return user


def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_token(auth.credentials)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        return user_repo.get_by_id(db, user_id)
    except Exception:
        return None


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise AppError(
            code="FORBIDDEN_ADMIN_ONLY",
            message="Administrator access is required for this action.",
            status_code=status.HTTP_403_FORBIDDEN
        )
    return user

