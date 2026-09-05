import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_categories_and_product_lifecycle():
    # 1. Register seller
    seller_res = client.post("/api/auth/register", json={
        "email": "seller.phase6@example.com",
        "password": "password123",
        "full_name": "Sarah Seller"
    })
    assert seller_res.status_code == 201
    seller_token = seller_res.json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    # 2. Register other user
    other_res = client.post("/api/auth/register", json={
        "email": "other.user@example.com",
        "password": "password123",
        "full_name": "Dave Other"
    })
    assert other_res.status_code == 201
    other_token = other_res.json()["access_token"]
    other_auth = {"Authorization": f"Bearer {other_token}"}

    # 3. Check categories seeded
    cat_res = client.get("/api/categories")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) > 0
    category_id = categories[0]["id"]

    # 4. Create Buy Now product without price -> fails
    fail_payload = {
        "category_id": category_id,
        "title": "Sony WH-1000XM4 Noise Cancelling",
        "brand": "Sony",
        "condition": "like_new",
        "listing_type": "buy_now",
        "price": None,
        "description": "Mint condition headphones with original box and cable."
    }
    fail_res = client.post("/api/products", json=fail_payload, headers=seller_auth)
    assert fail_res.status_code == 400
    assert fail_res.json()["error"]["code"] == "PRICE_REQUIRED"

    # 5. Create Buy Now product with valid price -> succeeds as draft
    valid_payload = {
        "category_id": category_id,
        "title": "Sony WH-1000XM4 Noise Cancelling",
        "brand": "Sony",
        "model": "WH-1000XM4",
        "condition": "like_new",
        "product_age_months": 6,
        "original_price": 29990.00,
        "listing_type": "buy_now",
        "price": 18500.00,
        "description": "Mint condition headphones with original box and cable.",
        "location": "Bangalore",
        "images": ["https://example.com/img1.jpg"],
        "attributes": [{"attribute_key": "Color", "attribute_value": "Black"}]
    }
    create_res = client.post("/api/products", json=valid_payload, headers=seller_auth)
    assert create_res.status_code == 201
    prod = create_res.json()
    assert prod["listing_status"] == "draft"
    assert prod["title"] == "Sony WH-1000XM4 Noise Cancelling"
    assert len(prod["images"]) == 1
    assert len(prod["attributes"]) == 1
    product_id = prod["id"]

    # 6. Non-owner cannot update or publish
    non_owner_update = client.put(f"/api/products/{product_id}", json={"price": 15000.00}, headers=other_auth)
    assert non_owner_update.status_code == 403
    assert non_owner_update.json()["error"]["code"] == "NOT_LISTING_OWNER"

    # 7. Owner publishes listing
    pub_res = client.post(f"/api/products/{product_id}/publish", headers=seller_auth)
    assert pub_res.status_code == 200
    assert pub_res.json()["listing_status"] == "published"

    # 8. Browse public published products
    browse_res = client.get("/api/products?q=Sony&listing_type=buy_now")
    assert browse_res.status_code == 200
    browse_data = browse_res.json()
    assert browse_data["total"] >= 1
    assert any(p["id"] == product_id for p in browse_data["items"])

    # 9. Get product detail
    detail_res = client.get(f"/api/products/{product_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == "Sony WH-1000XM4 Noise Cancelling"
    assert detail_res.json()["seller"]["full_name"] == "Sarah Seller"

    # 10. Pause listing
    pause_res = client.post(f"/api/products/{product_id}/pause", headers=seller_auth)
    assert pause_res.status_code == 200
    assert pause_res.json()["listing_status"] == "paused"

    # 11. Archive listing
    archive_res = client.post(f"/api/products/{product_id}/archive", headers=seller_auth)
    assert archive_res.status_code == 200
    assert archive_res.json()["listing_status"] == "archived"
