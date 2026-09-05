from sqlalchemy.orm import Session
from fastapi import status
from app.repositories import user_repo
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.schemas.user_schemas import UserRegister, UserLogin, TokenResponse, UserOut
from app.middleware.error_handler import AppError


def register_user(db: Session, payload: UserRegister) -> TokenResponse:
    existing = user_repo.get_by_email(db, payload.email)
    if existing:
        raise AppError(
            code="EMAIL_ALREADY_EXISTS",
            message="An account with this email already exists.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    # First user can be made admin if none exist, or regular user
    user_count = db.query(user_repo.User).count()
    role = "admin" if user_count == 0 else "user"

    pw_hash = hash_password(payload.password)
    user = user_repo.create_user(
        db=db,
        email=payload.email,
        password_hash=pw_hash,
        full_name=payload.full_name,
        phone=payload.phone,
        role=role
    )

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


def authenticate_user(db: Session, payload: UserLogin) -> TokenResponse:
    # Consistent error message to prevent account existence enumeration per 06_Security.md
    invalid_creds_error = AppError(
        code="INVALID_CREDENTIALS",
        message="Invalid email or password.",
        status_code=status.HTTP_401_UNAUTHORIZED
    )

    user = user_repo.get_by_email(db, payload.email)
    if not user:
        raise invalid_creds_error

    if not verify_password(payload.password, user.password_hash):
        raise invalid_creds_error

    if user.account_status == "suspended":
        raise AppError(
            code="ACCOUNT_SUSPENDED",
            message="This account has been suspended. Please contact support.",
            status_code=status.HTTP_403_FORBIDDEN
        )

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


def refresh_token(db: Session, refresh_token_str: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise AppError("INVALID_TOKEN", "Invalid token type.", status.HTTP_401_UNAUTHORIZED)
        user_id = payload.get("sub")
    except Exception:
        raise AppError("INVALID_TOKEN", "Refresh token is expired or invalid.", status.HTTP_401_UNAUTHORIZED)

    user = user_repo.get_by_id(db, user_id)
    if not user or user.account_status == "suspended":
        raise AppError("UNAUTHORIZED", "User not found or suspended.", status.HTTP_401_UNAUTHORIZED)

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

