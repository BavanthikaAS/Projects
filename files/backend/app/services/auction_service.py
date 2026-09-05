from sqlalchemy.orm import Session
from fastapi import status
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal

from app.models.auction import Auction, Bid, AuctionWinnerHistory
from app.models.product import Product
from app.repositories import auction_repo, product_repo, bid_repo
from app.schemas.auction_schemas import AuctionCreate, AuctionOut, BidOut
from app.schemas.product_schemas import ProductOut
from app.services.product_service import _format_product_out
from app.services import notification_service
from app.middleware.error_handler import AppError

PAYMENT_WINDOW_HOURS = 48


def _mask_bidder_name(user_id: str, full_name: Optional[str] = None) -> str:
    short_id = user_id[-4:]
    return f"Bidder ****{short_id}"


def _format_auction_out(auction: Auction, current_user_id: Optional[str] = None) -> AuctionOut:
    if auction.bid_count == 0:
        min_next = auction.starting_bid
    else:
        min_next = (auction.current_bid or auction.starting_bid) + auction.min_increment

    formatted_bids = []
    for b in (auction.bids or []):
        bidder_name = b.bidder.full_name if b.bidder else "Anonymous"
        formatted_bids.append(BidOut(
            id=b.id,
            auction_id=b.auction_id,
            bidder_id=b.bidder_id,
            bidder_masked_name=_mask_bidder_name(b.bidder_id, bidder_name),
            amount=b.amount,
            created_at=b.created_at
        ))

    prod_out = _format_product_out(auction.product) if auction.product else None

    return AuctionOut(
        id=auction.id,
        product_id=auction.product_id,
        starting_bid=auction.starting_bid,
        min_increment=auction.min_increment,
        current_bid=auction.current_bid,
        current_highest_bidder_id=auction.current_highest_bidder_id,
        bid_count=auction.bid_count,
        start_time=auction.start_time,
        end_time=auction.end_time,
        auction_status=auction.auction_status,
        created_at=auction.created_at,
        min_next_bid=min_next,
        product=prod_out,
        bids=formatted_bids,
        is_highest_bidder=bool(current_user_id and auction.current_highest_bidder_id == current_user_id),
        has_reserve=bool(auction.reserve_price is not None)
    )


def create_auction(db: Session, user_id: str, payload: AuctionCreate) -> AuctionOut:
    product = product_repo.get_product_by_id(db, payload.product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)

    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You are not authorized to create an auction for this product.", status.HTTP_403_FORBIDDEN)

    if product.listing_type != "auction":
        raise AppError("INVALID_LISTING_TYPE", "Product listing type is not 'auction'.", status.HTTP_400_BAD_REQUEST)

    existing = auction_repo.get_auction_by_product_id(db, payload.product_id)
    if existing:
        raise AppError("AUCTION_EXISTS", "An auction has already been configured for this product.", status.HTTP_400_BAD_REQUEST)

    now = datetime.now(timezone.utc)
    initial_status = "active" if payload.start_time <= now else "scheduled"

    auction = auction_repo.create_auction(
        db=db,
        product_id=payload.product_id,
        starting_bid=payload.starting_bid,
        min_increment=payload.min_increment,
        start_time=payload.start_time,
        end_time=payload.end_time,
        reserve_price=payload.reserve_price,
        status=initial_status
    )

    return _format_auction_out(auction, current_user_id=user_id)


def get_auction_detail(db: Session, auction_id: str, current_user_id: Optional[str] = None) -> AuctionOut:
    auction = auction_repo.get_auction_by_id(db, auction_id)
    if not auction:
        raise AppError("AUCTION_NOT_FOUND", "Auction was not found.", status.HTTP_404_NOT_FOUND)
    return _format_auction_out(auction, current_user_id=current_user_id)


def list_auctions(
    db: Session,
    status_filter: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user_id: Optional[str] = None
) -> List[AuctionOut]:
    auctions = auction_repo.list_auctions(db, status_filter=status_filter, limit=limit, offset=offset)
    return [_format_auction_out(a, current_user_id=current_user_id) for a in auctions]


def update_due_scheduled_auctions(db: Session) -> int:
    now = datetime.now(timezone.utc)
    due_auctions = auction_repo.get_scheduled_due_auctions(db, now)
    count = 0
    for a in due_auctions:
        a.auction_status = "active"
        count += 1
    if count > 0:
        db.commit()
    return count


def close_expired_auctions(db: Session, window_hours: int = PAYMENT_WINDOW_HOURS) -> List[Dict[str, Any]]:
    """
    Scheduled job function: closes active auctions past their end_time.
    Enforces reserve price and provisional winner payment window.
    """
    now = datetime.now(timezone.utc)
    expired_auctions = auction_repo.get_active_expired_auctions(db, now)
    results = []

    for auction in expired_auctions:
        # Atomic lock per auction
        locked_auc = db.query(Auction).filter(Auction.id == auction.id).with_for_update().first()
        if not locked_auc or locked_auc.auction_status != "active":
            continue

        highest_bid = bid_repo.get_highest_bid(db, locked_auc.id)
        item_title = locked_auc.product.title if locked_auc.product else "Auction Item"
        seller_id = locked_auc.product.seller_id if locked_auc.product else None

        # Case 1: No bids placed
        if not highest_bid:
            locked_auc.auction_status = "closed_unsold"
            db.commit()
            if seller_id:
                notification_service.create_notification(
                    db=db,
                    user_id=seller_id,
                    type="order_status",
                    message=f"Your auction for '{item_title}' ended with no bids and was marked unsold.",
                    related_entity_id=locked_auc.id
                )
            results.append({"auction_id": locked_auc.id, "outcome": "unsold_no_bids"})
            continue

        # Case 2: Reserve price not met
        if locked_auc.reserve_price and highest_bid.amount < locked_auc.reserve_price:
            locked_auc.auction_status = "closed_unsold"
            db.commit()
            if seller_id:
                notification_service.create_notification(
                    db=db,
                    user_id=seller_id,
                    type="order_status",
                    message=f"Auction for '{item_title}' closed. Highest bid ₹{highest_bid.amount:,.2f} did not meet reserve price.",
                    related_entity_id=locked_auc.id
                )
            results.append({"auction_id": locked_auc.id, "outcome": "unsold_reserve_not_met"})
            continue

        # Case 3: Reserve met / Valid winner
        locked_auc.auction_status = "awaiting_payment"
        deadline = now + timedelta(hours=window_hours)

        winner_hist = AuctionWinnerHistory(
            auction_id=locked_auc.id,
            bidder_id=highest_bid.bidder_id,
            sequence_number=1,
            offered_at=now,
            payment_deadline=deadline,
            outcome="pending"
        )
        db.add(winner_hist)
        db.commit()

        # Notify Winner
        notification_service.notify_auction_won(
            db=db,
            user_id=highest_bid.bidder_id,
            auction_id=locked_auc.id,
            item_title=item_title,
            amount=float(highest_bid.amount)
        )
        notification_service.notify_payment_window(
            db=db,
            user_id=highest_bid.bidder_id,
            auction_id=locked_auc.id,
            item_title=item_title,
            deadline_str=deadline.strftime("%Y-%m-%d %H:%M UTC")
        )

        results.append({
            "auction_id": locked_auc.id,
            "outcome": "provisional_winner",
            "winner_id": highest_bid.bidder_id,
            "amount": float(highest_bid.amount),
            "deadline": deadline.isoformat()
        })

    return results

