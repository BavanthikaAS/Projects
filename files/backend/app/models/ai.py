import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, JSON, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    feature = Column(String(30), nullable=False)
    input_summary = Column(JSON, nullable=False)
    output_summary = Column(JSON, nullable=True)
    status = Column(String(20), nullable=False)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "feature IN ('search', 'listing_assist', 'price_guidance', 'auction_assistant', 'review_summary', 'trust_review', 'image_assist', 'product_compare', 'seller_insights', 'faq')",
            name="check_ai_feature"
        ),
        CheckConstraint(
            "status IN ('success', 'failed', 'timeout', 'invalid_response')",
            name="check_ai_status"
        ),
        Index("idx_ai_feature_created", "feature", "created_at"),
    )


class AIReviewSummary(Base):
    __tablename__ = "ai_review_summaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary_text = Column(Text, nullable=False)
    positives = Column(JSON, nullable=True)
    complaints = Column(JSON, nullable=True)
    review_count_at_generation = Column(Integer, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    product = relationship("Product", back_populates="ai_review_summary")


class AIFlag(Base):
    __tablename__ = "ai_flags"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    target_type = Column(String(20), nullable=False)
    target_id = Column(String(36), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    signal_details = Column(JSON, nullable=True)
    review_status = Column(String(30), nullable=False, default="pending")
    reviewed_by_admin_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("target_type IN ('product', 'user')", name="check_ai_flag_target_type"),
        CheckConstraint("review_status IN ('pending', 'reviewed_ok', 'reviewed_action_taken')", name="check_ai_flag_review_status"),
        Index("idx_ai_flags_review_status_created", "review_status", "created_at"),
    )

    reviewed_by = relationship("User", foreign_keys=[reviewed_by_admin_id])

