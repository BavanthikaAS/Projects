import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_auction_engine_creation_and_validation():
    uid = uuid.uuid4().hex[:6]
    # 1. Register Seller & Other user
    seller_res = client.post("/api/auth/register", json={
        "email": f"seller.auction.{uid}@example.com",
        "password": "password123",
        "full_name": "Arthur Auctioneer"
    })
    seller_token = seller_res.json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    other_res = client.post("/api/auth/register", json={
        "email": f"other.auction.{uid}@example.com",
        "password": "password123",
        "full_name": "Oscar Other"
    })
    other_token = other_res.json()["access_token"]
    other_auth = {"Authorization": f"Bearer {other_token}"}

    # 2. Create an Auction product
    cat_res = client.get("/api/categories")
    cat_id = cat_res.json()[0]["id"]

    prod_res = client.post("/api/products", json={
        "category_id": cat_id,
        "title": "Vintage Mechanical Keyboard Cherry Blue",
        "brand": "Custom",
        "condition": "good",
        "listing_type": "auction",
        "price": None,
        "description": "Solid aluminum case with vintage clicky switches."
    }, headers=seller_auth)
    assert prod_res.status_code == 201
    product_id = prod_res.json()["id"]

    # 3. Invalid times (end_time in past / before start_time) -> rejected
    now = datetime.now(timezone.utc)
    bad_time_res = client.post("/api/auctions", json={
        "product_id": product_id,
        "starting_bid": 5000.00,
        "min_increment": 250.00,
        "start_time": now.isoformat(),
        "end_time": (now - timedelta(days=1)).isoformat()
    }, headers=seller_auth)
    assert bad_time_res.status_code == 422  # Pydantic validation error

    # 4. Non-owner cannot create auction
    non_owner_res = client.post("/api/auctions", json={
        "product_id": product_id,
        "starting_bid": 5000.00,
        "min_increment": 250.00,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(days=3)).isoformat()
    }, headers=other_auth)
    assert non_owner_res.status_code == 403
    assert non_owner_res.json()["error"]["code"] == "NOT_LISTING_OWNER"

    # 5. Valid auction creation by seller
    auction_res = client.post("/api/auctions", json={
        "product_id": product_id,
        "starting_bid": 5000.00,
        "min_increment": 250.00,
        "reserve_price": 7500.00,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(days=3)).isoformat()
    }, headers=seller_auth)
    assert auction_res.status_code == 201
    auction_data = auction_res.json()
    assert auction_data["auction_status"] == "active"
    assert float(auction_data["starting_bid"]) == 5000.00
    assert float(auction_data["min_next_bid"]) == 5000.00
    assert auction_data["bid_count"] == 0
    assert auction_data["has_reserve"] is True
    auction_id = auction_data["id"]

    # 6. Publish the product
    client.post(f"/api/products/{product_id}/publish", headers=seller_auth)

    # 7. Public auction detail retrieval
    detail_res = client.get(f"/api/auctions/{auction_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == auction_id
    assert detail_data["product"]["title"] == "Vintage Mechanical Keyboard Cherry Blue"

    # 8. List active auctions
    list_res = client.get("/api/auctions?status=active")
    assert list_res.status_code == 200
    assert any(a["id"] == auction_id for a in list_res.json())
