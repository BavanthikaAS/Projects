from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: str,
    type: str,
    message: str,
    related_entity_id: Optional[str] = None
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=type,
        message=message,
        related_entity_id=related_entity_id
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_outbid(db: Session, user_id: str, auction_id: str, item_title: str, new_amount: float):
    msg = f"You have been outbid on '{item_title}'. The current highest bid is now ₹{new_amount:,.2f}."
    create_notification(db, user_id, type="outbid", message=msg, related_entity_id=auction_id)


def notify_auction_won(db: Session, user_id: str, auction_id: str, item_title: str, amount: float):
    msg = f"Congratulations! You won the auction for '{item_title}' at ₹{amount:,.2f}. Please complete your payment."
    create_notification(db, user_id, type="auction_won", message=msg, related_entity_id=auction_id)


def notify_payment_window(db: Session, user_id: str, auction_id: str, item_title: str, deadline_str: str):
    msg = f"Payment window open for '{item_title}'. Complete payment before {deadline_str} to secure your order."
    create_notification(db, user_id, type="payment_window", message=msg, related_entity_id=auction_id)


def notify_order_status_change(db: Session, user_id: str, order_id: str, new_status: str):
    status_display = new_status.replace('_', ' ').capitalize()
    msg = f"Your order #{order_id[:8]} status has been updated to: {status_display}."
    create_notification(db, user_id, type="order_status", message=msg, related_entity_id=order_id)

