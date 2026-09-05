from sqlalchemy.orm import Session
from typing import Optional
from app.models.user import User, SellerProfile


def get_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def create_user(
    db: Session,
    email: str,
    password_hash: str,
    full_name: str,
    phone: Optional[str] = None,
    role: str = "user"
) -> User:
    user = User(
        email=email.lower().strip(),
        password_hash=password_hash,
        full_name=full_name.strip(),
        phone=phone.strip() if phone else None,
        role=role,
        account_status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_or_create_seller_profile(db: Session, user_id: str) -> SellerProfile:
    profile = db.query(SellerProfile).filter(SellerProfile.user_id == user_id).first()
    if not profile:
        profile = SellerProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

