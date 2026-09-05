from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from app.models.order import PaymentTransaction


def process_payment(
    db: Session,
    user_id: str,
    amount: Decimal,
    provider: str = "mock",
    order_id: Optional[str] = None,
    auction_id: Optional[str] = None,
    simulate_failure: bool = False
) -> PaymentTransaction:
    status = "failed" if simulate_failure or amount <= 0 else "success"
    
    transaction = PaymentTransaction(
        user_id=user_id,
        order_id=order_id,
        auction_id=auction_id,
        amount=amount,
        status=status,
        provider=provider
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction

