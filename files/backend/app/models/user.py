import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, Integer, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(20), nullable=False, default="user")
    account_status = Column(String(20), nullable=False, default="active")
    avg_rating = Column(Numeric(3, 2), default=0.0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("role IN ('user', 'admin')", name="check_user_role"),
        CheckConstraint("account_status IN ('active', 'restricted', 'suspended')", name="check_account_status"),
    )

    # Relationships
    seller_profile = relationship("SellerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    products = relationship("Product", back_populates="seller", foreign_keys="Product.seller_id")
    bids = relationship("Bid", back_populates="bidder", foreign_keys="Bid.bidder_id")
    orders = relationship("Order", back_populates="buyer", foreign_keys="Order.buyer_id")
    reviews_written = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    reviews_received = relationship("Review", back_populates="seller", foreign_keys="Review.seller_id")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id")
    reports_filed = relationship("Report", back_populates="reporter", foreign_keys="Report.reporter_id")
    reputation_events = relationship("SellerReputationEvent", back_populates="user", foreign_keys="SellerReputationEvent.user_id")


class SellerProfile(Base):
    __tablename__ = "seller_profiles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    display_name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    total_sales = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="seller_profile")

