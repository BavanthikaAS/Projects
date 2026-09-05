from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.schemas.product_schemas import ProductOut


class CheckoutItem(BaseModel):
    product_id: str


class CheckoutRequest(BaseModel):
    items: List[CheckoutItem] = Field(..., min_length=1)
    payment_method: str = "mock_card"  # mock_card, mock_upi, mock_netbanking
    simulate_failure: bool = False


class PaymentTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    order_id: Optional[str] = None
    auction_id: Optional[str] = None
    user_id: str
    amount: Decimal
    status: str
    provider: str
    created_at: datetime


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    order_id: str
    product_id: str
    seller_id: str
    price: Decimal
    product: Optional[ProductOut] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    buyer_id: str
    order_type: str
    total_amount: Decimal
    order_status: str
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemOut] = []
    payments: List[PaymentTransactionOut] = []


class OrderStatusUpdate(BaseModel):
    order_status: str

    @field_validator("order_status")
    def validate_status(cls, v):
        allowed = {"placed", "processing", "shipped", "completed", "cancelled"}
        if v not in allowed:
            raise ValueError(f"Invalid order status. Must be one of {allowed}")
        return v

