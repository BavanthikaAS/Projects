import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import inspect
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.user import User, SellerProfile
from backend.app.models.product import Category, Product, ProductImage, ProductAttribute
from backend.app.models.auction import Auction, Bid, AuctionWinnerHistory
from backend.app.models.order import Order, OrderItem, PaymentTransaction
from backend.app.models.review import Review
from backend.app.models.wishlist import Wishlist
from backend.app.models.notification import Notification
from backend.app.models.report import Report, SellerReputationEvent
from backend.app.models.ai import AIInteraction, AIReviewSummary, AIFlag


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup


def test_all_tables_exist():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected_tables = [
        "users", "seller_profiles", "categories", "products", "product_images",
        "product_attributes", "auctions", "bids", "auction_winner_history",
        "orders", "order_items", "payment_transactions", "wishlists", "reviews",
        "notifications", "reports", "seller_reputation_events", "ai_interactions",
        "ai_review_summaries", "ai_flags"
    ]
    
    for table in expected_tables:
        assert table in tables, f"Table {table} was not found in database!"


def test_schema_crud_and_relationships():
    db = SessionLocal()
    try:
        # 1. Create User
        user = User(
            email="seller@example.com",
            password_hash="hashed_pw",
            full_name="Alice Seller",
            role="user",
            account_status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.id is not None

        # 2. Create Category
        category = Category(
            name="Laptops",
            slug="laptops"
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        assert category.id is not None

        # 3. Create Product
        product = Product(
            seller_id=user.id,
            category_id=category.id,
            title="MacBook Air M1 8GB 256GB",
            brand="Apple",
            model="MacBook Air M1",
            condition="like_new",
            product_age_months=12,
            original_price=92900.00,
            listing_type="auction",
            price=None,
            description="Mint condition laptop, no scratches, battery health 94%",
            listing_status="published"
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        assert product.id is not None

        # 4. Create Auction
        now = datetime.now(timezone.utc)
        auction = Auction(
            product_id=product.id,
            starting_bid=45000.00,
            min_increment=1000.00,
            reserve_price=50000.00,
            current_bid=45000.00,
            start_time=now,
            end_time=now + timedelta(days=3),
            auction_status="active"
        )
        db.add(auction)
        db.commit()
        db.refresh(auction)
        assert auction.id is not None

        # 5. Buyer & Bid
        buyer = User(
            email="buyer@example.com",
            password_hash="hashed_buyer_pw",
            full_name="Bob Buyer",
            role="user"
        )
        db.add(buyer)
        db.commit()
        db.refresh(buyer)

        bid = Bid(
            auction_id=auction.id,
            bidder_id=buyer.id,
            amount=46000.00
        )
        db.add(bid)
        auction.current_bid = 46000.00
        auction.current_highest_bidder_id = buyer.id
        auction.bid_count = 1
        db.commit()
        db.refresh(bid)
        assert bid.id is not None

        # 6. Verify Relationships
        assert len(product.auction.bids) == 1
        assert product.auction.highest_bidder.email == "buyer@example.com"

    finally:
        db.close()
