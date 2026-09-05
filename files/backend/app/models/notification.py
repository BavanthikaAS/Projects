import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(30), nullable=False)
    message = Column(Text, nullable=False)
    related_entity_id = Column(String(36), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "type IN ('outbid', 'auction_won', 'payment_window', 'order_status', 'ai_flag_admin', 'report_update')",
            name="check_notification_type"
        ),
        Index("idx_notifications_user_read", "user_id", "is_read", "created_at"),
    )

    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])

