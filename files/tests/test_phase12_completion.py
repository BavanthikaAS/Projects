import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.services import auction_service
from backend.app.models.auction import AuctionWinnerHistory, Auction

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_auction_closing_and_reserve_check():
    uid = uuid.uuid4().hex[:6]
    
    # 1. Register Seller & Two Bidders
    seller_token = client.post("/api/auth/register", json={
        "email": f"seller.{uid}@closetest.com", "password": "password123", "full_name": "Auction Seller"
    }).json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    b1_token = client.post("/api/auth/register", json={
        "email": f"b1.{uid}@closetest.com", "password": "password123", "full_name": "Winner Bidder"
    }).json()["access_token"]
    b1_auth = {"Authorization": f"Bearer {b1_token}"}

    cat_id = client.get("/api/categories").json()[0]["id"]

    # SCENARIO A: Valid winner meeting reserve
    p1_res = client.post("/api/products", json={
        "category_id": cat_id,
        "title": "iPad Pro 11 M2 128GB",
        "condition": "like_new",
        "listing_type": "auction",
        "price": None,
        "description": "Mint condition tablet."
    }, headers=seller_auth)
    p1_id = p1_res.json()["id"]

    # Create auction whose end_time is in the past (expired)
    now = datetime.now(timezone.utc)
    auc1_res = client.post("/api/auctions", json={
        "product_id": p1_id,
        "starting_bid": 30000.00,
        "min_increment": 1000.00,
        "reserve_price": 35000.00,
        "start_time": (now - timedelta(days=2)).isoformat(),
        "end_time": (now - timedelta(minutes=5)).isoformat()
    }, headers=seller_auth)
    auc1_id = auc1_res.json()["id"]

    # Manually place winning bid meeting reserve
    db = SessionLocal()
    auc1 = db.query(Auction).filter(Auction.id == auc1_id).first()
    auc1.auction_status = "active"
    db.commit()
    db.close()

    bid_res = client.post(f"/api/auctions/{auc1_id}/bids", json={"amount": 36000.00}, headers=b1_auth)
    assert bid_res.status_code == 201

    # Run scheduled close job
    db = SessionLocal()
    results = auction_service.close_expired_auctions(db)
    db.close()

    # Verify Outcome A
    res_a = next(r for r in results if r["auction_id"] == auc1_id)
    assert res_a["outcome"] == "provisional_winner"
    assert res_a["amount"] == 36000.00

    # Verify Database state
    db = SessionLocal()
    auc1_db = db.query(Auction).filter(Auction.id == auc1_id).first()
    assert auc1_db.auction_status == "awaiting_payment"

    winner_hist = db.query(AuctionWinnerHistory).filter(AuctionWinnerHistory.auction_id == auc1_id).first()
    assert winner_hist is not None
    assert winner_hist.sequence_number == 1
    assert winner_hist.outcome == "pending"
    db.close()


def test_auction_closing_reserve_not_met():
    uid = uuid.uuid4().hex[:6]
    seller_token = client.post("/api/auth/register", json={
        "email": f"seller.{uid}@reservetest.com", "password": "password123", "full_name": "Reserve Seller"
    }).json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    b1_token = client.post("/api/auth/register", json={
        "email": f"b1.{uid}@reservetest.com", "password": "password123", "full_name": "Low Bidder"
    }).json()["access_token"]
    b1_auth = {"Authorization": f"Bearer {b1_token}"}

    cat_id = client.get("/api/categories").json()[0]["id"]

    # SCENARIO B: Highest bid below reserve
    p2_res = client.post("/api/products", json={
        "category_id": cat_id,
        "title": "Sony Alpha A7 IV",
        "condition": "like_new",
        "listing_type": "auction",
        "price": None,
        "description": "High end camera."
    }, headers=seller_auth)
    p2_id = p2_res.json()["id"]

    now = datetime.now(timezone.utc)
    auc2_res = client.post("/api/auctions", json={
        "product_id": p2_id,
        "starting_bid": 100000.00,
        "min_increment": 2000.00,
        "reserve_price": 150000.00,  # Reserve is 1.5L
        "start_time": (now - timedelta(days=2)).isoformat(),
        "end_time": (now - timedelta(minutes=2)).isoformat()
    }, headers=seller_auth)
    auc2_id = auc2_res.json()["id"]

    db = SessionLocal()
    auc2 = db.query(Auction).filter(Auction.id == auc2_id).first()
    auc2.auction_status = "active"
    db.commit()
    db.close()

    # Bid 100,000 (below 150,000 reserve)
    client.post(f"/api/auctions/{auc2_id}/bids", json={"amount": 100000.00}, headers=b1_auth)

    # Run close job
    db = SessionLocal()
    results = auction_service.close_expired_auctions(db)
    db.close()

    res_b = next(r for r in results if r["auction_id"] == auc2_id)
    assert res_b["outcome"] == "unsold_reserve_not_met"

    db = SessionLocal()
    auc2_db = db.query(Auction).filter(Auction.id == auc2_id).first()
    assert auc2_db.auction_status == "closed_unsold"
    db.close()
