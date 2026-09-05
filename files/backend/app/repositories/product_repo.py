from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc, asc
from typing import Optional, List, Tuple
from app.models.product import Category, Product, ProductImage, ProductAttribute
from app.models.auction import Auction
from app.schemas.product_schemas import ProductCreate, ProductUpdate, ProductSearchParams


# --- Categories ---
def create_category(db: Session, name: str, slug: str, parent_id: Optional[str] = None) -> Category:
    cat = Category(name=name, slug=slug.lower().strip(), parent_id=parent_id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def get_category_by_id(db: Session, category_id: str) -> Optional[Category]:
    return db.query(Category).filter(Category.id == category_id).first()


def get_category_by_slug(db: Session, slug: str) -> Optional[Category]:
    return db.query(Category).filter(Category.slug == slug.lower().strip()).first()


def list_categories(db: Session) -> List[Category]:
    return db.query(Category).order_by(Category.name.asc()).all()


# --- Products ---
def create_product(db: Session, seller_id: str, payload: ProductCreate) -> Product:
    product = Product(
        seller_id=seller_id,
        category_id=payload.category_id,
        title=payload.title,
        brand=payload.brand,
        model=payload.model,
        condition=payload.condition,
        product_age_months=payload.product_age_months,
        original_price=payload.original_price,
        listing_type=payload.listing_type,
        price=payload.price if payload.listing_type == "buy_now" else None,
        description=payload.description,
        location=payload.location,
        accessories_included=payload.accessories_included,
        defects_notes=payload.defects_notes,
        warranty_info=payload.warranty_info,
        listing_status="draft"
    )
    db.add(product)
    db.flush()

    # Images
    for idx, img_path in enumerate(payload.images):
        img = ProductImage(product_id=product.id, storage_path=img_path, display_order=idx)
        db.add(img)

    # Attributes
    for attr in payload.attributes:
        att = ProductAttribute(
            product_id=product.id,
            attribute_key=attr.attribute_key,
            attribute_value=attr.attribute_value
        )
        db.add(att)

    db.commit()
    db.refresh(product)
    return product


def get_product_by_id(db: Session, product_id: str) -> Optional[Product]:
    return (
        db.query(Product)
        .options(
            joinedload(Product.category),
            joinedload(Product.seller),
            joinedload(Product.images),
            joinedload(Product.attributes),
            joinedload(Product.auction)
        )
        .filter(Product.id == product_id)
        .first()
    )


def update_product(db: Session, product: Product, payload: ProductUpdate) -> Product:
    update_data = payload.model_dump(exclude_unset=True)

    if "images" in update_data and update_data["images"] is not None:
        db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
        for idx, img_path in enumerate(update_data["images"]):
            db.add(ProductImage(product_id=product.id, storage_path=img_path, display_order=idx))
        del update_data["images"]

    if "attributes" in update_data and update_data["attributes"] is not None:
        db.query(ProductAttribute).filter(ProductAttribute.product_id == product.id).delete()
        for attr in payload.attributes:
            db.add(ProductAttribute(
                product_id=product.id,
                attribute_key=attr.attribute_key,
                attribute_value=attr.attribute_value
            ))
        del update_data["attributes"]

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()


def list_products(
    db: Session,
    params: ProductSearchParams,
    seller_id: Optional[str] = None
) -> Tuple[List[Product], int]:
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.seller),
        joinedload(Product.images),
        joinedload(Product.attributes),
        joinedload(Product.auction)
    )

    if seller_id:
        query = query.filter(Product.seller_id == seller_id)

    if params.listing_status:
        query = query.filter(Product.listing_status == params.listing_status)

    if params.listing_type:
        query = query.filter(Product.listing_type == params.listing_type)

    if params.category_id:
        query = query.filter(Product.category_id == params.category_id)
    elif params.category:
        cat = get_category_by_slug(db, params.category)
        if cat:
            query = query.filter(Product.category_id == cat.id)

    if params.condition:
        query = query.filter(Product.condition == params.condition)

    if params.min_price is not None:
        query = query.filter(
            or_(
                Product.price >= params.min_price,
                and_(Product.auction != None, Auction.starting_bid >= params.min_price)
            )
        )

    if params.max_price is not None:
        query = query.filter(
            or_(
                Product.price <= params.max_price,
                and_(Product.auction != None, Auction.starting_bid <= params.max_price)
            )
        )

    if params.q:
        search_term = f"%{params.q.strip()}%"
        query = query.filter(
            or_(
                Product.title.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.model.ilike(search_term),
                Product.description.ilike(search_term)
            )
        )

    # Sorting
    if params.sort_by == "price_asc":
        query = query.order_by(Product.price.asc().nullslast())
    elif params.sort_by == "price_desc":
        query = query.order_by(Product.price.desc().nullslast())
    elif params.sort_by == "ending_soon":
        query = query.outerjoin(Product.auction).filter(Product.listing_type == "auction").order_by(Auction.end_time.asc())
    else:  # newest / relevance
        query = query.order_by(Product.created_at.desc())

    total = query.count()
    offset = (params.page - 1) * params.limit
    items = query.offset(offset).limit(params.limit).all()

    return items, total

