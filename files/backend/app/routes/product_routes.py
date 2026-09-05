from fastapi import APIRouter, Depends, Query, UploadFile, File, status, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from decimal import Decimal

from app.core.database import get_db
from app.schemas.product_schemas import (
    ProductCreate, ProductUpdate, ProductOut, ProductSearchParams,
    CategoryCreate, CategoryOut
)
from app.utils.pagination import PaginatedResponse
from app.services import product_service, storage_service
from app.repositories import product_repo
from app.middleware.auth_middleware import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/api", tags=["Products & Categories"])


# --- Categories ---
@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return product_repo.list_categories(db)


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return product_repo.create_category(
        db=db,
        name=payload.name,
        slug=payload.slug,
        parent_id=payload.parent_id
    )


# --- Products ---
@router.get("/products", response_model=PaginatedResponse[ProductOut])
def browse_products(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    min_price: Optional[Decimal] = Query(None),
    max_price: Optional[Decimal] = Query(None),
    listing_type: Optional[str] = Query(None),
    listing_status: Optional[str] = Query("published"),
    sort_by: Optional[str] = Query("newest"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    params = ProductSearchParams(
        q=q,
        category=category,
        category_id=category_id,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
        listing_type=listing_type,
        listing_status=listing_status,
        sort_by=sort_by,
        page=page,
        limit=limit
    )
    return product_service.search_products(db, params)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    return product_service.get_product_detail(db, product_id)


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.create_listing(db, current_user.id, payload)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.update_listing(db, product_id, current_user.id, payload)


@router.post("/products/{product_id}/publish", response_model=ProductOut)
def publish_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.publish_listing(db, product_id, current_user.id)


@router.post("/products/{product_id}/pause", response_model=ProductOut)
def pause_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.pause_listing(db, product_id, current_user.id)


@router.post("/products/{product_id}/archive", response_model=ProductOut)
def archive_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.archive_listing(db, product_id, current_user.id)


@router.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return product_service.delete_listing(db, product_id, current_user.id)


# --- Image Upload Endpoints ---
@router.post("/products/{product_id}/images/upload-url")
def get_upload_url(
    product_id: str,
    filename: str = Body(..., embed=True),
    content_type: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return storage_service.generate_signed_upload_url(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
        filename=filename,
        content_type=content_type
    )


@router.post("/products/{product_id}/images/upload")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await storage_service.save_product_image_upload(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
        file=file
    )

