import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from concurrent.futures import ThreadPoolExecutor
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_bidding_lifecycle_and_rules():
    uid = uuid.uuid4().hex[:6]
    
    # 1. Register Seller, Bidder 1, Bidder 2
    seller_res = client.post("/api/auth/register", json={
        "email": f"seller.{uid}@bidtest.com",
        "password": "password123",
        "full_name": "Sam Seller"
    })
    seller_token = seller_res.json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    b1_res = client.post("/api/auth/register", json={
        "email": f"b1.{uid}@bidtest.com",
        "password": "password123",
        "full_name": "Alice Bidder"
    })
    b1_token = b1_res.json()["access_token"]
    b1_auth = {"Authorization": f"Bearer {b1_token}"}

    b2_res = client.post("/api/auth/register", json={
        "email": f"b2.{uid}@bidtest.com",
        "password": "password123",
        "full_name": "Bob Bidder"
    })
    b2_token = b2_res.json()["access_token"]
    b2_auth = {"Authorization": f"Bearer {b2_token}"}

    # 2. Create product & auction
    cat_id = client.get("/api/categories").json()[0]["id"]
    prod_res = client.post("/api/products", json={
        "category_id": cat_id,
        "title": "Nikon Z6 II Mirrorless",
        "condition": "like_new",
        "listing_type": "auction",
        "price": None,
        "description": "Like new camera with 24-70mm lens."
    }, headers=seller_auth)
    product_id = prod_res.json()["id"]

    now = datetime.now(timezone.utc)
    auc_res = client.post("/api/auctions", json={
        "product_id": product_id,
        "starting_bid": 10000.00,
        "min_increment": 500.00,
        "reserve_price": 15000.00,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(days=2)).isoformat()
    }, headers=seller_auth)
    auction_id = auc_res.json()["id"]
    client.post(f"/api/products/{product_id}/publish", headers=seller_auth)

    # 3. Seller cannot bid on their own auction
    seller_bid = client.post(f"/api/auctions/{auction_id}/bids", json={"amount": 10000.00}, headers=seller_auth)
    assert seller_bid.status_code == 400
    assert seller_bid.json()["error"]["code"] == "SELLER_CANNOT_BID"

    # 4. Bidder 1 places valid opening bid
    b1_bid_res = client.post(f"/api/auctions/{auction_id}/bids", json={"amount": 10000.00}, headers=b1_auth)
    assert b1_bid_res.status_code == 201
    assert float(b1_bid_res.json()["amount"]) == 10000.00

    # 5. Bidder 1 cannot immediately bid again while winning
    b1_dup_res = client.post(f"/api/auctions/{auction_id}/bids", json={"amount": 10500.00}, headers=b1_auth)
    assert b1_dup_res.status_code == 400
    assert b1_dup_res.json()["error"]["code"] == "ALREADY_HIGHEST_BIDDER"

    # 6. Bidder 2 attempts bid below minimum increment (10200 < 10500) -> rejected
    low_bid_res = client.post(f"/api/auctions/{auction_id}/bids", json={"amount": 10200.00}, headers=b2_auth)
    assert low_bid_res.status_code == 400
    assert low_bid_res.json()["error"]["code"] == "BID_TOO_LOW"

    # 7. Bidder 2 places valid outbid (10500) -> succeeds
    b2_bid_res = client.post(f"/api/auctions/{auction_id}/bids", json={"amount": 10500.00}, headers=b2_auth)
    assert b2_bid_res.status_code == 201
    assert float(b2_bid_res.json()["amount"]) == 10500.00

    # 8. Check bid history (masked names and descending order)
    hist_res = client.get(f"/api/auctions/{auction_id}/bids")
    assert hist_res.status_code == 200
    bids = hist_res.json()
    assert len(bids) == 2
    assert float(bids[0]["amount"]) == 10500.00
    assert float(bids[1]["amount"]) == 10000.00
    assert "Bidder ****" in bids[0]["bidder_masked_name"]

    # 9. Verify auction detail state
    auc_detail = client.get(f"/api/auctions/{auction_id}", headers=b2_auth).json()
    assert float(auc_detail["current_bid"]) == 10500.00
    assert float(auc_detail["min_next_bid"]) == 11000.00
    assert auc_detail["bid_count"] == 2
    assert auc_detail["is_highest_bidder"] is True
