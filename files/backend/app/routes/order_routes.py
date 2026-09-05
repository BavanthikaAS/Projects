from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.order_schemas import CheckoutRequest, OrderOut, OrderStatusUpdate
from app.services import order_service
from app.middleware.auth_middleware import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api", tags=["Orders & Checkout"])


@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def checkout_cart(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return order_service.create_order_from_cart(db, current_user.id, payload)


@router.get("/orders", response_model=List[OrderOut])
def get_buyer_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return order_service.get_buyer_orders(db, current_user.id)


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return order_service.get_order_detail(db, order_id, current_user.id, current_user.role)


@router.get("/seller/orders", response_model=List[OrderOut])
def get_seller_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return order_service.get_seller_orders(db, current_user.id)


@router.put("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return order_service.update_order_status(db, order_id, current_user.id, payload.order_status, current_user.role)

