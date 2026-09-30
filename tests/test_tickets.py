import pytest

@pytest.mark.asyncio
async def test_create_and_list_tickets(async_client, test_user):
    # Login as customer
    login_res = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "customer@example.com",
            "password": "password123"
        }
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create ticket
    create_res = await async_client.post(
        "/api/v1/tickets/",
        json={
            "title": "Printer Not Working",
            "description": "Office printer is jammed and flashing red lights.",
            "priority": "High",
            "category": "IT Support"
        },
        headers=headers
    )
    assert create_res.status_code == 201
    ticket_data = create_res.json()
    assert ticket_data["title"] == "Printer Not Working"
    assert ticket_data["status"] == "Open"

    # List tickets
    list_res = await async_client.get("/api/v1/tickets/", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 1
    assert len(list_data["items"]) == 1
    assert list_data["items"][0]["title"] == "Printer Not Working"
