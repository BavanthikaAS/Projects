import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_buy_now_order_lifecycle():
    uid = uuid.uuid4().hex[:6]
    # 1. Register Seller & Buyer
    seller_res = client.post("/api/auth/register", json={
        "email": f"seller.{uid}@example.com",
        "password": "password123",
        "full_name": "Oliver OrderSeller"
    })
    assert seller_res.status_code == 201, seller_res.text
    seller_token = seller_res.json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    buyer_res = client.post("/api/auth/register", json={
        "email": f"buyer.{uid}@example.com",
        "password": "password123",
        "full_name": "Bella Buyer"
    })
    assert buyer_res.status_code == 201, buyer_res.text
    buyer_token = buyer_res.json()["access_token"]
    buyer_auth = {"Authorization": f"Bearer {buyer_token}"}

    # 2. Get category & create Buy Now product
    cat_res = client.get("/api/categories")
    cat_id = cat_res.json()[0]["id"]

    prod_res = client.post("/api/products", json={
        "category_id": cat_id,
        "title": "Dell XPS 13 i7 16GB RAM",
        "brand": "Dell",
        "condition": "like_new",
        "listing_type": "buy_now",
        "price": 55000.00,
        "description": "Premium ultrabook in pristine condition with charger."
    }, headers=seller_auth)
    product_id = prod_res.json()["id"]

    # Publish product
    client.post(f"/api/products/{product_id}/publish", headers=seller_auth)

    # 3. Seller cannot buy their own item
    self_buy_res = client.post("/api/orders", json={
        "items": [{"product_id": product_id}],
        "payment_method": "mock_card"
    }, headers=seller_auth)
    assert self_buy_res.status_code == 400
    assert self_buy_res.json()["error"]["code"] == "BUYER_IS_SELLER"

    # 4. Simulated payment failure doesn't create order or change product status
    fail_res = client.post("/api/orders", json={
        "items": [{"product_id": product_id}],
        "payment_method": "mock_card",
        "simulate_failure": True
    }, headers=buyer_auth)
    assert fail_res.status_code == 400
    assert fail_res.json()["error"]["code"] == "PAYMENT_FAILED"

    # Verify product is still published
    check_prod = client.get(f"/api/products/{product_id}").json()
    assert check_prod["listing_status"] == "published"

    # 5. Successful purchase
    order_res = client.post("/api/orders", json={
        "items": [{"product_id": product_id}],
        "payment_method": "mock_card",
        "simulate_failure": False
    }, headers=buyer_auth)
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert float(order_data["total_amount"]) == 55000.00
    assert order_data["order_status"] == "placed"
    assert len(order_data["payments"]) == 1
    assert order_data["payments"][0]["status"] == "success"
    order_id = order_data["id"]

    # Verify product is archived
    check_prod_after = client.get(f"/api/products/{product_id}").json()
    assert check_prod_after["listing_status"] == "archived"

    # 6. Buyer sees order in history
    buyer_orders_res = client.get("/api/orders", headers=buyer_auth)
    assert buyer_orders_res.status_code == 200
    assert any(o["id"] == order_id for o in buyer_orders_res.json())

    # 7. Seller sees incoming order
    seller_orders_res = client.get("/api/seller/orders", headers=seller_auth)
    assert seller_orders_res.status_code == 200
    assert any(o["id"] == order_id for o in seller_orders_res.json())

    # 8. Seller updates status: placed -> processing -> shipped -> completed
    for next_status in ["processing", "shipped", "completed"]:
        update_res = client.put(
            f"/api/orders/{order_id}/status",
            json={"order_status": next_status},
            headers=seller_auth
        )
        assert update_res.status_code == 200
        assert update_res.json()["order_status"] == next_status
