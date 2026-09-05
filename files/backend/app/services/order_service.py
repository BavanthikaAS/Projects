from sqlalchemy.orm import Session
from fastapi import status
from typing import List, Optional
from decimal import Decimal

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import SellerProfile
from app.repositories import order_repo, product_repo, user_repo
from app.schemas.order_schemas import CheckoutRequest, OrderOut, OrderItemOut, PaymentTransactionOut
from app.services import payment_service, notification_service
from app.middleware.error_handler import AppError


def _format_order_out(order: Order) -> OrderOut:
    items_out = []
    for item in order.items:
        items_out.append(OrderItemOut(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            seller_id=item.seller_id,
            price=item.price
        ))

    payments_out = []
    for pay in order.payments:
        payments_out.append(PaymentTransactionOut(
            id=pay.id,
            order_id=pay.order_id,
            auction_id=pay.auction_id,
            user_id=pay.user_id,
            amount=pay.amount,
            status=pay.status,
            provider=pay.provider,
            created_at=pay.created_at
        ))

    return OrderOut(
        id=order.id,
        buyer_id=order.buyer_id,
        order_type=order.order_type,
        total_amount=order.total_amount,
        order_status=order.order_status,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items_out,
        payments=payments_out
    )


def create_order_from_cart(db: Session, buyer_id: str, payload: CheckoutRequest) -> OrderOut:
    items_data = []
    total_amount = Decimal("0.00")
    products_to_archive = []

    for item in payload.items:
        product = product_repo.get_product_by_id(db, item.product_id)
        if not product:
            raise AppError("PRODUCT_NOT_FOUND", f"Product #{item.product_id} was not found.", status.HTTP_404_NOT_FOUND)

        if product.listing_status != "published":
            raise AppError("ITEM_UNAVAILABLE", f"Item '{product.title}' is no longer available for purchase.")

        if product.listing_type != "buy_now":
            raise AppError("INVALID_LISTING_TYPE", f"Item '{product.title}' is an auction item, not Buy Now.")

        if product.seller_id == buyer_id:
            raise AppError("BUYER_IS_SELLER", "You cannot purchase your own listed items.", status.HTTP_400_BAD_REQUEST)

        price = product.price or Decimal("0.00")
        total_amount += price
        items_data.append({
            "product_id": product.id,
            "seller_id": product.seller_id,
            "price": price,
            "title": product.title
        })
        products_to_archive.append(product)

    # Process Payment Transaction
    payment = payment_service.process_payment(
        db=db,
        user_id=buyer_id,
        amount=total_amount,
        provider=payload.payment_method,
        simulate_failure=payload.simulate_failure
    )

    if payment.status != "success":
        raise AppError("PAYMENT_FAILED", "Payment transaction failed. Your card was not charged.", status.HTTP_400_BAD_REQUEST)

    # Atomic Order Creation
    order = order_repo.create_order(
        db=db,
        buyer_id=buyer_id,
        order_type="buy_now",
        total_amount=total_amount,
        items_data=items_data
    )

    # Link payment
    payment.order_id = order.id
    db.commit()

    # Archive products & increment seller sales counts
    for p in products_to_archive:
        p.listing_status = "archived"
        seller_profile = user_repo.get_or_create_seller_profile(db, p.seller_id)
        seller_profile.total_sales += 1

    db.commit()

    # Send notifications
    notification_service.create_notification(
        db=db,
        user_id=buyer_id,
        type="order_status",
        message=f"Order #{order.id[:8]} placed successfully for ₹{total_amount:,.2f}.",
        related_entity_id=order.id
    )

    for item in items_data:
        notification_service.create_notification(
            db=db,
            user_id=item["seller_id"],
            type="order_status",
            message=f"New order received for '{item['title']}' from buyer.",
            related_entity_id=order.id
        )

    return _format_order_out(order)


def get_buyer_orders(db: Session, buyer_id: str) -> List[OrderOut]:
    orders = order_repo.list_orders_by_buyer(db, buyer_id)
    return [_format_order_out(o) for o in orders]


def get_seller_orders(db: Session, seller_id: str) -> List[OrderOut]:
    orders = order_repo.list_orders_by_seller(db, seller_id)
    return [_format_order_out(o) for o in orders]


def get_order_detail(db: Session, order_id: str, user_id: str, role: str) -> OrderOut:
    order = order_repo.get_order_by_id(db, order_id)
    if not order:
        raise AppError("ORDER_NOT_FOUND", "Order not found.", status.HTTP_404_NOT_FOUND)

    is_buyer = order.buyer_id == user_id
    is_seller = any(item.seller_id == user_id for item in order.items)
    is_admin = role == "admin"

    if not (is_buyer or is_seller or is_admin):
        raise AppError("FORBIDDEN", "You are not authorized to view this order.", status.HTTP_403_FORBIDDEN)

    return _format_order_out(order)


def update_order_status(db: Session, order_id: str, user_id: str, new_status: str, role: str) -> OrderOut:
    order = order_repo.get_order_by_id(db, order_id)
    if not order:
        raise AppError("ORDER_NOT_FOUND", "Order not found.", status.HTTP_404_NOT_FOUND)

    is_seller = any(item.seller_id == user_id for item in order.items)
    is_admin = role == "admin"

    if not (is_seller or is_admin):
        raise AppError("FORBIDDEN", "Only the seller or administrator can update order progress.", status.HTTP_403_FORBIDDEN)

    updated = order_repo.update_order_status(db, order, new_status)
    notification_service.notify_order_status_change(db, order.buyer_id, order.id, new_status)

    return _format_order_out(updated)

