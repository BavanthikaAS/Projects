import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_image_storage_and_upload():
    # 1. Register seller
    seller_res = client.post("/api/auth/register", json={
        "email": "seller.phase7@example.com",
        "password": "password123",
        "full_name": "Image Seller"
    })
    assert seller_res.status_code == 201
    seller_token = seller_res.json()["access_token"]
    seller_auth = {"Authorization": f"Bearer {seller_token}"}

    # 2. Get category and create product
    cat_res = client.get("/api/categories")
    cat_id = cat_res.json()[0]["id"]

    prod_res = client.post("/api/products", json={
        "category_id": cat_id,
        "title": "Canon EOS R6 Camera Body",
        "condition": "like_new",
        "listing_type": "buy_now",
        "price": 140000.00,
        "description": "Full frame mirrorless camera, pristine condition with box."
    }, headers=seller_auth)
    assert prod_res.status_code == 201
    product_id = prod_res.json()["id"]

    # 3. Request signed upload URL
    url_res = client.post(f"/api/products/{product_id}/images/upload-url", json={
        "filename": "camera.jpg",
        "content_type": "image/jpeg"
    }, headers=seller_auth)
    assert url_res.status_code == 200
    assert "upload_url" in url_res.json()
    assert "storage_path" in url_res.json()

    # 4. Upload valid image file
    fake_img = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"\x00" * 50)
    upload_res = client.post(
        f"/api/products/{product_id}/images/upload",
        files={"file": ("test_camera.jpg", fake_img, "image/jpeg")},
        headers=seller_auth
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert "storage_path" in upload_data
    assert upload_data["storage_path"].startswith("/uploads/")

    # 5. Upload invalid MIME type -> rejected
    fake_pdf = io.BytesIO(b"%PDF-1.4" + b"\x00" * 50)
    bad_upload_res = client.post(
        f"/api/products/{product_id}/images/upload",
        files={"file": ("document.pdf", fake_pdf, "application/pdf")},
        headers=seller_auth
    )
    assert bad_upload_res.status_code == 400
    assert bad_upload_res.json()["error"]["code"] == "INVALID_FILE_TYPE"
