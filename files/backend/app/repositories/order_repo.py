from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from decimal import Decimal
from app.models.order import Order, OrderItem, PaymentTransaction
from app.models.product import Product


def create_order(
    db: Session,
    buyer_id: str,
    order_type: str,
    total_amount: Decimal,
    items_data: List[dict]
) -> Order:
    order = Order(
        buyer_id=buyer_id,
        order_type=order_type,
        total_amount=total_amount,
        order_status="placed"
    )
    db.add(order)
    db.flush()

    for item in items_data:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item["product_id"],
            seller_id=item["seller_id"],
            price=item["price"]
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)
    return order


def get_order_by_id(db: Session, order_id: str) -> Optional[Order]:
    return (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.payments),
            joinedload(Order.buyer)
        )
        .filter(Order.id == order_id)
        .first()
    )


def list_orders_by_buyer(db: Session, buyer_id: str) -> List[Order]:
    return (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.payments)
        )
        .filter(Order.buyer_id == buyer_id)
        .order_by(Order.created_at.desc())
        .all()
    )


def list_orders_by_seller(db: Session, seller_id: str) -> List[Order]:
    return (
        db.query(Order)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .filter(OrderItem.seller_id == seller_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.payments),
            joinedload(Order.buyer)
        )
        .order_by(Order.created_at.desc())
        .distinct()
        .all()
    )


def update_order_status(db: Session, order: Order, new_status: str) -> Order:
    order.order_status = new_status
    db.commit()
    db.refresh(order)
    return order

