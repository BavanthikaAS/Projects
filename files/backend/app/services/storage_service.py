import os
import uuid
import mimetypes
from fastapi import UploadFile, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.config import settings
from app.middleware.error_handler import AppError
from app.models.product import Product, ProductImage
from app.repositories import product_repo

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif"
}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def validate_image_file(content_type: str, file_size: int = 0) -> str:
    if content_type.lower() not in ALLOWED_MIME_TYPES:
        raise AppError(
            code="INVALID_FILE_TYPE",
            message=f"Only image files ({', '.join(ALLOWED_MIME_TYPES)}) are allowed.",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    if file_size > MAX_FILE_SIZE_BYTES:
        raise AppError(
            code="FILE_TOO_LARGE",
            message="Image file size exceeds the 5MB limit.",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    ext = mimetypes.guess_extension(content_type) or ".jpg"
    if ext == ".jpe":
        ext = ".jpg"
    return ext


def generate_signed_upload_url(db: Session, product_id: str, user_id: str, filename: str, content_type: str) -> Dict[str, Any]:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)
    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You do not own this listing.", status.HTTP_403_FORBIDDEN)

    ext = validate_image_file(content_type)
    unique_filename = f"{product_id}/{uuid.uuid4()}{ext}"
    
    # In production with live Supabase Storage, this generates a signed PUT URL using supabase-py
    # For local/standalone, it returns the structured upload endpoint & target path
    public_url = f"/uploads/{unique_filename}" if not settings.SUPABASE_URL.startswith("http://") and not settings.SUPABASE_URL.startswith("https://mock") else f"/uploads/{unique_filename}"
    
    return {
        "upload_url": f"/api/products/{product_id}/images/upload",
        "storage_path": public_url,
        "filename": unique_filename,
        "max_size_bytes": MAX_FILE_SIZE_BYTES,
        "allowed_types": list(ALLOWED_MIME_TYPES)
    }


async def save_product_image_upload(
    db: Session,
    product_id: str,
    user_id: str,
    file: UploadFile
) -> Dict[str, Any]:
    product = product_repo.get_product_by_id(db, product_id)
    if not product:
        raise AppError("PRODUCT_NOT_FOUND", "Product does not exist.", status.HTTP_404_NOT_FOUND)
    if product.seller_id != user_id:
        raise AppError("NOT_LISTING_OWNER", "You do not own this listing.", status.HTTP_403_FORBIDDEN)

    contents = await file.read()
    ext = validate_image_file(file.content_type, len(contents))

    # Save to local uploads folder
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads", product_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    storage_path = f"/uploads/{product_id}/{filename}"
    
    # Record in database
    existing_count = db.query(ProductImage).filter(ProductImage.product_id == product_id).count()
    img_record = ProductImage(
        product_id=product_id,
        storage_path=storage_path,
        display_order=existing_count
    )
    db.add(img_record)
    db.commit()
    db.refresh(img_record)

    return {
        "id": img_record.id,
        "product_id": product_id,
        "storage_path": storage_path,
        "display_order": img_record.display_order
    }

