from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.auction import Auction, Bid, AuctionWinnerHistory
from app.models.product import Product


def create_auction(
    db: Session,
    product_id: str,
    starting_bid: Decimal,
    min_increment: Decimal,
    start_time: datetime,
    end_time: datetime,
    reserve_price: Optional[Decimal] = None,
    status: str = "scheduled"
) -> Auction:
    auction = Auction(
        product_id=product_id,
        starting_bid=starting_bid,
        min_increment=min_increment,
        reserve_price=reserve_price,
        current_bid=starting_bid,
        start_time=start_time,
        end_time=end_time,
        auction_status=status
    )
    db.add(auction)
    db.commit()
    db.refresh(auction)
    return auction


def get_auction_by_id(db: Session, auction_id: str) -> Optional[Auction]:
    return (
        db.query(Auction)
        .options(
            joinedload(Auction.product).joinedload(Product.images),
            joinedload(Auction.product).joinedload(Product.seller),
            joinedload(Auction.bids).joinedload(Bid.bidder)
        )
        .filter(Auction.id == auction_id)
        .first()
    )


def get_auction_by_product_id(db: Session, product_id: str) -> Optional[Auction]:
    return db.query(Auction).filter(Auction.product_id == product_id).first()


def list_auctions(
    db: Session,
    status_filter: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
) -> List[Auction]:
    query = db.query(Auction).options(
        joinedload(Auction.product).joinedload(Product.images),
        joinedload(Auction.product).joinedload(Product.seller)
    )

    if status_filter:
        query = query.filter(Auction.auction_status == status_filter)
    else:
        query = query.filter(Auction.auction_status.in_(["active", "scheduled", "awaiting_payment"]))

    return query.order_by(Auction.end_time.asc()).offset(offset).limit(limit).all()


def get_scheduled_due_auctions(db: Session, current_time: datetime) -> List[Auction]:
    return (
        db.query(Auction)
        .filter(
            Auction.auction_status == "scheduled",
            Auction.start_time <= current_time
        )
        .all()
    )


def get_active_expired_auctions(db: Session, current_time: datetime) -> List[Auction]:
    return (
        db.query(Auction)
        .filter(
            Auction.auction_status == "active",
            Auction.end_time <= current_time
        )
        .all()
    )

