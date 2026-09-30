import pytest

@pytest.mark.asyncio
async def test_register_user(async_client):
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "password123",
            "full_name": "New User"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data

@pytest.mark.asyncio
async def test_login_user(async_client, test_user):
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "customer@example.com",
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
