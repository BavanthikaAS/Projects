from sqlalchemy.orm import Session
from fastapi import status
from typing import Optional, Dict, Any
from decimal import Decimal

from app.repositories import product_repo, user_repo
from app.schemas.product_schemas import (
    ProductCreate, ProductUpdate, ProductOut, ProductSearchParams,
    SellerSummaryOut, CategoryOut
)
from app.utils.pagination import PaginatedResponse
from app.middleware.error_handler import AppError
from app.models.product import Product


def _format_product_out(p: Product) -> ProductOut:
    seller_summary = None
    if p.seller:
        seller_summary = SellerSummaryOut(
            id=p.seller.id,
            full_name=p.seller.full_name,
            avg_rating=p.seller.avg_rating or Decimal("0.0"),
            total_sales=p.seller.seller_profile.total_sales if p.seller.seller_profile else 0,
            member_since=p.seller.created_at
        )

    return ProductOut(
        id=p.id,
        seller_id=p.seller_id,
        category_id=p.category_id,
        title=p.title,
        brand=p.brand,
        model=p.model,
        condition=p.condition,
        product_age_months=p.product_age_months,
        original_price=p.original_price,
        listing_type=p.listing_type,
        price=p.price,
        description=p.description,
        location=p.location,
        accessories_included=p.accessories_included,
        defects_notes=p.defects_notes,
        warranty_info=p.warranty_info,
        listing_status=p.listing_status,
        created_at=p.created_at,
        updated_at=p.updated_at,
        category=CategoryOut.model_validate(p.category) if p.category else None,
        seller=seller_summary,
        images=[img for img in p.images],
        attributes=[attr for attr in p.attributes],
        auction=p.auction,
        seller_rating=float(p.seller.avg_rating) if p.seller and p.seller.avg_rating else 5.0
    )


def create_listing(db: Session, user_id: str, payload: ProductCreate) -> ProductOut:
    # Validate Buy Now pricing requirement
    if payload.listing_type == "buy_now":
        if payload.price is None or payload.price <= 0:
            raise AppError(
                code="PRICE_REQUIRED",
                message="Buy Now listings must have a price greater than 0.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

    # Validate category exists
    cat = product_repo.get_category_by_id(db, payload.category_id)
    if not cat:
        raise AppError(
            code="CATEGORY_NOT_FOUND",
            message="Selected category does not exist.",
            status_code=status.HTTP_404_NOT_FOUND
        )

    # Lazily ensure seller profile exists per 05_Schema.md §2.2
    user_repo.get_or_create_seller_profile(db, user_id)

    product = product_repo.create_product(db, seller_id=user_id, payload=payload)
    return _format_product_out(product)


def update_listing(db: Session, product_id: str, user_id: str, payload: ProductUpdate) -> ProductOut:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)

    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You are not authorized to edit this listing.", status.HTTP_403_FORBIDDEN)

    # If auction has active bids, price/time cannot be edited per 01_Product_Requirement_Documentation.md §17
    if product.listing_type == "auction" and product.auction and product.auction.bid_count > 0:
        if payload.price is not None:
            raise AppError("AUCTION_HAS_BIDS", "Cannot modify listing pricing once bids have been placed.")

    updated = product_repo.update_product(db, product, payload)
    return _format_product_out(updated)


def publish_listing(db: Session, product_id: str, user_id: str) -> ProductOut:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)

    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You are not authorized to publish this listing.", status.HTTP_403_FORBIDDEN)

    if product.listing_type == "buy_now" and (not product.price or product.price <= 0):
        raise AppError("PRICE_REQUIRED", "Buy Now listing must have a valid price before publishing.")

    product.listing_status = "published"
    db.commit()
    db.refresh(product)
    return _format_product_out(product)


def pause_listing(db: Session, product_id: str, user_id: str) -> ProductOut:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)

    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You are not authorized to pause this listing.", status.HTTP_403_FORBIDDEN)

    product.listing_status = "paused"
    db.commit()
    db.refresh(product)
    return _format_product_out(product)


def archive_listing(db: Session, product_id: str, user_id: str) -> ProductOut:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)

    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You are not authorized to archive this listing.", status.HTTP_403_FORBIDDEN)

    product.listing_status = "archived"
    db.commit()
    db.refresh(product)
    return _format_product_out(product)


def delete_listing(db: Session, product_id: str, user_id: str) -> Dict[str, Any]:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)

    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You are not authorized to delete this listing.", status.HTTP_403_FORBIDDEN)

    if product.listing_status != "draft":
        raise AppError("DELETE_DRAFT_ONLY", "Only draft listings can be deleted. Use archive instead.")

    product_repo.delete_product(db, product)
    return {"message": "Draft listing successfully deleted."}


def get_product_detail(db: Session, product_id: str) -> ProductOut:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product not found.", status.HTTP_404_NOT_FOUND)
    return _format_product_out(product)


def search_products(
    db: Session,
    params: ProductSearchParams,
    seller_id: Optional[str] = None
) -> PaginatedResponse[ProductOut]:
    items, total = product_repo.list_products(db, params, seller_id=seller_id)
    out_items = [_format_product_out(p) for p in items]
    return PaginatedResponse.create(
        items=out_items,
        total=total,
        page=params.page,
        page_size=params.limit
    )

