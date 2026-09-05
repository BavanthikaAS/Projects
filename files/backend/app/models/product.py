import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Numeric, Integer, SmallInteger, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    subcategories = relationship("Category", backref="parent", remote_side=[id])
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    model = Column(String(255), nullable=True)
    condition = Column(String(20), nullable=False)
    product_age_months = Column(Integer, nullable=True)
    original_price = Column(Numeric(12, 2), nullable=True)
    listing_type = Column(String(20), nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=True)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=True)
    accessories_included = Column(Text, nullable=True)
    defects_notes = Column(Text, nullable=True)
    warranty_info = Column(Text, nullable=True)
    listing_status = Column(String(20), nullable=False, default="draft", index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("condition IN ('new', 'like_new', 'good', 'fair', 'poor')", name="check_product_condition"),
        CheckConstraint("listing_type IN ('buy_now', 'auction')", name="check_product_listing_type"),
        CheckConstraint("listing_status IN ('draft', 'published', 'paused', 'archived', 'removed')", name="check_product_listing_status"),
        Index("idx_category_status_price", "category_id", "listing_status", "price"),
    )

    seller = relationship("User", back_populates="products", foreign_keys=[seller_id])
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")
    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan")
    auction = relationship("Auction", back_populates="product", uselist=False, cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")
    ai_review_summary = relationship("AIReviewSummary", back_populates="product", uselist=False)


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_path = Column(Text, nullable=False)
    display_order = Column(SmallInteger, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    product = relationship("Product", back_populates="images")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    attribute_key = Column(String(255), nullable=False)
    attribute_value = Column(Text, nullable=False)

    product = relationship("Product", back_populates="attributes")

