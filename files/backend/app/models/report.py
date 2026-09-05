import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(20), nullable=False)
    target_id = Column(String(36), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="open")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("target_type IN ('product', 'user')", name="check_report_target_type"),
        CheckConstraint("status IN ('open', 'reviewed', 'resolved', 'dismissed')", name="check_report_status"),
    )

    reporter = relationship("User", back_populates="reports_filed", foreign_keys=[reporter_id])


class SellerReputationEvent(Base):
    __tablename__ = "seller_reputation_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(30), nullable=False)
    related_entity_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('non_payment', 'positive_review', 'negative_review', 'admin_warning', 'admin_restriction')",
            name="check_reputation_event_type"
        ),
    )

    user = relationship("User", back_populates="reputation_events", foreign_keys=[user_id])

