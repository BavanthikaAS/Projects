from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    storage_path: str
    display_order: int
    created_at: datetime


class ProductAttributeCreate(BaseModel):
    attribute_key: str
    attribute_value: str


class ProductAttributeOut(ProductAttributeCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str


class AuctionSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    starting_bid: Decimal
    min_increment: Decimal
    current_bid: Optional[Decimal] = None
    bid_count: int = 0
    start_time: datetime
    end_time: datetime
    auction_status: str


class SellerSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    avg_rating: Optional[Decimal] = Decimal("0.0")
    total_sales: int = 0
    member_since: datetime


class ProductCreate(BaseModel):
    category_id: str
    title: str = Field(..., min_length=3, max_length=255)
    brand: Optional[str] = None
    model: Optional[str] = None
    condition: str
    product_age_months: Optional[int] = None
    original_price: Optional[Decimal] = None
    listing_type: str
    price: Optional[Decimal] = None
    description: str = Field(..., min_length=10)
    location: Optional[str] = None
    accessories_included: Optional[str] = None
    defects_notes: Optional[str] = None
    warranty_info: Optional[str] = None
    images: List[str] = []
    attributes: List[ProductAttributeCreate] = []

    @field_validator("condition")
    def validate_condition(cls, v):
        allowed = {"new", "like_new", "good", "fair", "poor"}
        if v not in allowed:
            raise ValueError(f"Condition must be one of {allowed}")
        return v

    @field_validator("listing_type")
    def validate_listing_type(cls, v):
        allowed = {"buy_now", "auction"}
        if v not in allowed:
            raise ValueError(f"Listing type must be one of {allowed}")
        return v


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    title: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    condition: Optional[str] = None
    product_age_months: Optional[int] = None
    original_price: Optional[Decimal] = None
    price: Optional[Decimal] = None
    description: Optional[str] = None
    location: Optional[str] = None
    accessories_included: Optional[str] = None
    defects_notes: Optional[str] = None
    warranty_info: Optional[str] = None
    images: Optional[List[str]] = None
    attributes: Optional[List[ProductAttributeCreate]] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seller_id: str
    category_id: str
    title: str
    brand: Optional[str] = None
    model: Optional[str] = None
    condition: str
    product_age_months: Optional[int] = None
    original_price: Optional[Decimal] = None
    listing_type: str
    price: Optional[Decimal] = None
    description: str
    location: Optional[str] = None
    accessories_included: Optional[str] = None
    defects_notes: Optional[str] = None
    warranty_info: Optional[str] = None
    listing_status: str
    created_at: datetime
    updated_at: datetime

    category: Optional[CategoryOut] = None
    seller: Optional[SellerSummaryOut] = None
    images: List[ProductImageOut] = []
    attributes: List[ProductAttributeOut] = []
    auction: Optional[AuctionSummaryOut] = None
    seller_rating: Optional[float] = 5.0


class ProductSearchParams(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    condition: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    listing_type: Optional[str] = None
    listing_status: Optional[str] = "published"
    sort_by: Optional[str] = "newest"  # relevance, price_asc, price_desc, newest, ending_soon
    page: int = 1
    limit: int = 20

