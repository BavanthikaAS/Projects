import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Integer, SmallInteger, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Auction(Base):
    __tablename__ = "auctions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)
    starting_bid = Column(Numeric(12, 2), nullable=False)
    min_increment = Column(Numeric(12, 2), nullable=False)
    reserve_price = Column(Numeric(12, 2), nullable=True)
    current_bid = Column(Numeric(12, 2), nullable=True)
    current_highest_bidder_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    bid_count = Column(Integer, default=0, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    auction_status = Column(String(25), nullable=False, default="scheduled")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "auction_status IN ('scheduled', 'active', 'closed_sold', 'closed_unsold', 'awaiting_payment')",
            name="check_auction_status"
        ),
        Index("idx_auction_status_end_time", "auction_status", "end_time"),
    )

    product = relationship("Product", back_populates="auction")
    highest_bidder = relationship("User", foreign_keys=[current_highest_bidder_id])
    bids = relationship("Bid", back_populates="auction", cascade="all, delete-orphan", order_by="desc(Bid.amount)")
    winner_history = relationship("AuctionWinnerHistory", back_populates="auction", cascade="all, delete-orphan", order_by="AuctionWinnerHistory.sequence_number")


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    auction_id = Column(String(36), ForeignKey("auctions.id", ondelete="CASCADE"), nullable=False)
    bidder_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        Index("idx_bids_lookup", "auction_id", "amount", "created_at"),
    )

    auction = relationship("Auction", back_populates="bids")
    bidder = relationship("User", back_populates="bids", foreign_keys=[bidder_id])


class AuctionWinnerHistory(Base):
    __tablename__ = "auction_winner_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    auction_id = Column(String(36), ForeignKey("auctions.id", ondelete="CASCADE"), nullable=False)
    bidder_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sequence_number = Column(SmallInteger, nullable=False)
    offered_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    payment_deadline = Column(DateTime(timezone=True), nullable=False)
    outcome = Column(String(20), nullable=False, default="pending")

    __table_args__ = (
        CheckConstraint("outcome IN ('pending', 'paid', 'expired', 'declined')", name="check_winner_outcome"),
        Index("idx_winner_history_seq", "auction_id", "sequence_number"),
    )

    auction = relationship("Auction", back_populates="winner_history")
    bidder = relationship("User", foreign_keys=[bidder_id])

