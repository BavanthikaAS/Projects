from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_homepage_serves_html():
    response = client.get("/")
    assert response.status_code == 200
    assert "Auction" in response.text
    assert "Discover Great Deals" in response.text


def test_static_css_and_js():
    css_res = client.get("/css/styles.css")
    assert css_res.status_code == 200
    assert "--color-primary" in css_res.text
    assert "--color-accent" in css_res.text

    js_api_res = client.get("/js/api.js")
    assert js_api_res.status_code == 200
    assert "API" in js_api_res.text

    js_app_res = client.get("/js/app.js")
    assert js_app_res.status_code == 200
    assert "showToast" in js_app_res.text
