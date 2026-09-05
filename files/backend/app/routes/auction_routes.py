from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.schemas.auction_schemas import AuctionCreate, AuctionOut, BidCreate, BidOut
from app.services import auction_service, bid_service
from app.middleware.auth_middleware import get_current_user, get_optional_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auctions", tags=["Auctions"])


@router.post("", response_model=AuctionOut, status_code=status.HTTP_201_CREATED)
def create_auction(
    payload: AuctionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return auction_service.create_auction(db, current_user.id, payload)


@router.get("", response_model=List[AuctionOut])
def list_auctions(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    offset = (page - 1) * limit
    user_id = current_user.id if current_user else None
    return auction_service.list_auctions(db, status_filter=status, limit=limit, offset=offset, current_user_id=user_id)


@router.get("/{auction_id}", response_model=AuctionOut)
def get_auction_detail(
    auction_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    user_id = current_user.id if current_user else None
    return auction_service.get_auction_detail(db, auction_id, current_user_id=user_id)


@router.post("/{auction_id}/bids", response_model=BidOut, status_code=status.HTTP_201_CREATED)
def place_bid(
    auction_id: str,
    payload: BidCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return bid_service.place_bid(db, auction_id, current_user.id, payload.amount)


@router.get("/{auction_id}/bids", response_model=List[BidOut])
def get_bid_history(
    auction_id: str,
    db: Session = Depends(get_db)
):
    return bid_service.get_bid_history(db, auction_id)

