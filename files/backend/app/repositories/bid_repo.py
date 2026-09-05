from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from app.models.auction import Bid
from app.models.user import User


def list_bids_for_auction(db: Session, auction_id: str, limit: int = 50) -> List[Bid]:
    return (
        db.query(Bid)
        .options(joinedload(Bid.bidder))
        .filter(Bid.auction_id == auction_id)
        .order_by(Bid.amount.desc(), Bid.created_at.desc())
        .limit(limit)
        .all()
    )


def get_highest_bid(db: Session, auction_id: str) -> Optional[Bid]:
    return (
        db.query(Bid)
        .options(joinedload(Bid.bidder))
        .filter(Bid.auction_id == auction_id)
        .order_by(Bid.amount.desc(), Bid.created_at.asc())
        .first()
    )

