from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from decimal import Decimal
from app.schemas.product_schemas import ProductOut


class BidCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Bid amount in INR")


class BidOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    auction_id: str
    bidder_id: str
    bidder_masked_name: str
    amount: Decimal
    created_at: datetime


class AuctionCreate(BaseModel):
    product_id: str
    starting_bid: Decimal = Field(..., gt=0)
    min_increment: Decimal = Field(Decimal("500.00"), gt=0)
    reserve_price: Optional[Decimal] = None
    start_time: datetime
    end_time: datetime

    @field_validator("end_time")
    def validate_times(cls, end_time, info):
        start_time = info.data.get("start_time")
        if start_time and end_time <= start_time:
            raise ValueError("Auction end_time must be strictly after start_time.")
        return end_time


class AuctionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    starting_bid: Decimal
    min_increment: Decimal
    current_bid: Optional[Decimal] = None
    current_highest_bidder_id: Optional[str] = None
    bid_count: int = 0
    start_time: datetime
    end_time: datetime
    auction_status: str
    created_at: datetime

    min_next_bid: Decimal
    product: Optional[ProductOut] = None
    bids: List[BidOut] = []
    is_highest_bidder: bool = False
    has_reserve: bool = False

