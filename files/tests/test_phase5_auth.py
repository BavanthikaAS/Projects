import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown():
    Base.metadata.create_all(bind=engine)
    yield


def test_auth_full_lifecycle():
    # 1. Register a new user
    reg_payload = {
        "email": "charlie.auth@example.com",
        "password": "strong_password_123",
        "full_name": "Charlie Chaplin",
        "phone": "9876543210"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    assert reg_data["user"]["email"] == "charlie.auth@example.com"
    assert reg_data["user"]["full_name"] == "Charlie Chaplin"

    access_token = reg_data["access_token"]
    refresh_token = reg_data["refresh_token"]

    # 2. Duplicate registration fails
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400
    assert dup_res.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"

    # 3. Access protected /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "charlie.auth@example.com"

    # 4. Access /api/auth/me without token fails
    no_auth_res = client.get("/api/auth/me")
    assert no_auth_res.status_code == 401

    # 5. Login with valid credentials
    login_res = client.post("/api/auth/login", json={
        "email": "charlie.auth@example.com",
        "password": "strong_password_123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 6. Login with invalid password fails with non-leaky message
    bad_pw_res = client.post("/api/auth/login", json={
        "email": "charlie.auth@example.com",
        "password": "wrong_password"
    })
    assert bad_pw_res.status_code == 401
    assert bad_pw_res.json()["error"]["code"] == "INVALID_CREDENTIALS"

    # 7. Login with non-existent user returns same non-leaky error code
    bad_user_res = client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "some_password"
    })
    assert bad_user_res.status_code == 401
    assert bad_user_res.json()["error"]["code"] == "INVALID_CREDENTIALS"

    # 8. Refresh token generates new access token
    refresh_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
    new_access_token = refresh_res.json()["access_token"]

    # 9. Verify new access token works
    new_me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert new_me_res.status_code == 200
