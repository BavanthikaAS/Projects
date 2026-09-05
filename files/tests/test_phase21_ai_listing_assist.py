import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_ai_listing_assist_success():
    payload = {
        "description": "Selling iPhone 13 128GB blue, 1.5 yrs old, slight scuff on corner, original box and cable included"
    }
    response = client.post("/api/ai/listing-assist", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert data["brand"] == "Apple"
    assert data["category_slug"] == "mobiles-tablets"
    assert data["condition"] in ["like_new", "good", "fair", "poor", "new"]
    assert "description" in data


def test_ai_listing_assist_laptop():
    payload = {
        "description": "Dell XPS 15 9500 16GB RAM 512GB SSD in like new condition, barely used, with original charger"
    }
    response = client.post("/api/ai/listing-assist", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["brand"] == "Dell"
    assert data["category_slug"] == "laptops-computers"
    assert data["condition"] == "like_new"


def test_ai_listing_assist_empty_description():
    response = client.post("/api/ai/listing-assist", json={"description": ""})
    assert response.status_code == 422
