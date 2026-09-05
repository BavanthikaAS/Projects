from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.ai_schemas import ListingAssistRequest, ListingAssistOut
from app.services import ai_service
from app.middleware.auth_middleware import get_optional_current_user
from app.models.user import User

router = APIRouter(prefix="/api/ai", tags=["AI Services"])


@router.post("/listing-assist", response_model=ListingAssistOut)
def listing_assist(
    payload: ListingAssistRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user_id = current_user.id if current_user else None
    return ai_service.generate_listing_draft(db, payload.description, user_id=user_id)
