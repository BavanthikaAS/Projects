from sqlalchemy.orm import Session
from fastapi import status
from datetime import datetime, timezone
from decimal import Decimal
from typing import List

from app.models.auction import Auction, Bid
from app.models.user import User
from app.repositories import bid_repo, auction_repo
from app.schemas.auction_schemas import BidOut
from app.services import notification_service
from app.services.auction_service import _mask_bidder_name
from app.middleware.error_handler import BidError, AppError


def _format_bid_out(bid: Bid) -> BidOut:
    bidder_name = bid.bidder.full_name if bid.bidder else "Anonymous"
    return BidOut(
        id=bid.id,
        auction_id=bid.auction_id,
        bidder_id=bid.bidder_id,
        bidder_masked_name=_mask_bidder_name(bid.bidder_id, bidder_name),
        amount=bid.amount,
        created_at=bid.created_at
    )


def place_bid(db: Session, auction_id: str, bidder_id: str, amount: Decimal) -> BidOut:
    # 1. Fetch bidder and verify active account
    bidder = db.query(User).filter(User.id == bidder_id).first()
    if not bidder or bidder.account_status != "active":
        raise BidError("ACCOUNT_RESTRICTED", "Your account is not permitted to place bids.")

    # 2. Database Transaction with row locking
    # In SQLite with_for_update() is a no-op; in PostgreSQL it issues SELECT ... FOR UPDATE
    auction = db.query(Auction).filter(Auction.id == auction_id).with_for_update().first()
    if not auction:
        raise AppError("AUCTION_NOT_FOUND", "Auction was not found.", status.HTTP_404_NOT_FOUND)

    if auction.auction_status != "active":
        raise BidError("AUCTION_NOT_ACTIVE", "This auction is not currently active for bidding.")

    now = datetime.now(timezone.utc)
    start = auction.start_time if auction.start_time.tzinfo else auction.start_time.replace(tzinfo=timezone.utc)
    end = auction.end_time if auction.end_time.tzinfo else auction.end_time.replace(tzinfo=timezone.utc)

    if now < start or now > end:
        raise BidError("AUCTION_TIMING_INVALID", "Bidding is closed because the auction has expired.")

    if auction.product and auction.product.seller_id == bidder_id:
        raise BidError("SELLER_CANNOT_BID", "Sellers are prohibited from bidding on their own auctions.")

    if auction.current_highest_bidder_id == bidder_id:
        raise BidError("ALREADY_HIGHEST_BIDDER", "You are already the highest bidder.")

    # Compute minimum required bid
    if auction.bid_count == 0:
        min_next = auction.starting_bid
    else:
        min_next = (auction.current_bid or auction.starting_bid) + auction.min_increment

    if amount < min_next:
        raise BidError("BID_TOO_LOW", f"Bid amount must be at least ₹{min_next:,.2f}.")

    prev_highest_bidder_id = auction.current_highest_bidder_id
    item_title = auction.product.title if auction.product else "Auction Item"

    # Insert bid & update auction state
    bid = Bid(
        auction_id=auction_id,
        bidder_id=bidder_id,
        amount=amount
    )
    db.add(bid)

    auction.current_bid = amount
    auction.current_highest_bidder_id = bidder_id
    auction.bid_count += 1
    db.add(auction)
    db.commit()
    db.refresh(bid)

    # 3. Notify outbid user
    if prev_highest_bidder_id and prev_highest_bidder_id != bidder_id:
        try:
            notification_service.notify_outbid(
                db=db,
                user_id=prev_highest_bidder_id,
                auction_id=auction_id,
                item_title=item_title,
                new_amount=float(amount)
            )
        except Exception:
            pass  # Non-blocking notification failure

    return _format_bid_out(bid)


def get_bid_history(db: Session, auction_id: str) -> List[BidOut]:
    bids = bid_repo.list_bids_for_auction(db, auction_id)
    return [_format_bid_out(b) for b in bids]

