"""Authentication, ownership, and history tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

REFERENCE = {
    "segments": [{"label": "Main roof", "area_m2": 200, "material": "tiles"}],
    "rainfall": {
        "annual_mm": 900,
        "monthly_mm": [5, 5, 5, 5, 10, 140, 300, 250, 130, 35, 10, 5],
    },
    "demand": {"people": 4, "litres_per_person_per_day": 100},
    "site": {
        "infiltration_mm_per_hr": 25,
        "water_table_depth_m": 12,
        "contamination_distance_m": 30,
        "available_space_m2": 20,
        "slope_pct": 2,
    },
}


def register(client: TestClient, email: str = "asha@example.com") -> dict:
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "monsoon2026rain", "full_name": "Asha Rao"},
    )


def test_register_returns_tokens_and_user(client: TestClient) -> None:
    response = register(client)
    assert response.status_code == 201
    body = response.json()

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["email"] == "asha@example.com"


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    assert register(client).status_code == 201
    assert register(client).status_code == 409


def test_weak_password_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "short"},
    )
    assert response.status_code == 422


def test_invalid_email_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "monsoon2026rain"},
    )
    assert response.status_code == 422


def test_login_wrong_password_is_rejected(client: TestClient) -> None:
    register(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "asha@example.com", "password": "wrong-password-1"},
    )
    assert response.status_code == 401


def test_login_returns_tokens(client: TestClient) -> None:
    register(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "ASHA@example.com", "password": "monsoon2026rain"},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_me_requires_a_token(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_the_signed_in_user(client: TestClient, auth: dict[str, str]) -> None:
    response = client.get("/api/v1/auth/me", headers=auth)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Asha Rao"


def test_refresh_returns_a_new_pair(client: TestClient) -> None:
    body = register(client).json()
    response = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]}
    )
    assert response.status_code == 200
    assert response.json()["access_token"] != body["access_token"]


def test_logout_revokes_existing_tokens(client: TestClient, auth: dict[str, str]) -> None:
    assert client.post("/api/v1/auth/logout", headers=auth).status_code == 200
    assert client.get("/api/v1/auth/me", headers=auth).status_code == 401


def test_property_crud_is_owner_scoped(client: TestClient, auth: dict[str, str]) -> None:
    created = client.post(
        "/api/v1/properties",
        headers=auth,
        json={"name": "Home", "address": "Pune", "latitude": 18.52, "longitude": 73.85},
    )
    assert created.status_code == 201
    property_id = created.json()["id"]

    listed = client.get("/api/v1/properties", headers=auth)
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [property_id]

    patched = client.patch(
        f"/api/v1/properties/{property_id}", headers=auth, json={"name": "Home and shop"}
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Home and shop"

    archived = client.delete(f"/api/v1/properties/{property_id}", headers=auth)
    assert archived.status_code == 200
    assert archived.json()["is_archived"] is True
    assert client.get("/api/v1/properties", headers=auth).json() == []


def test_another_user_cannot_read_the_property(client: TestClient, auth: dict[str, str]) -> None:
    property_id = client.post(
        "/api/v1/properties", headers=auth, json={"name": "Home"}
    ).json()["id"]

    other = register(client, "other@example.com").json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    assert client.get(f"/api/v1/properties/{property_id}", headers=other_headers).status_code == 404
    assert client.get("/api/v1/properties", headers=other_headers).json() == []


def test_assessment_is_saved_with_a_snapshot(client: TestClient, auth: dict[str, str]) -> None:
    property_id = client.post(
        "/api/v1/properties", headers=auth, json={"name": "Home"}
    ).json()["id"]

    created = client.post(
        f"/api/v1/properties/{property_id}/assessments",
        headers=auth,
        json={"label": "Baseline", "payload": REFERENCE},
    )
    assert created.status_code == 201, created.text

    body = created.json()
    assert body["system"] == "storage_and_recharge"
    assert body["result"]["coverage"]["annual_net_litres"] == 143412.0
    assert body["input"]["segments"][0]["area_m2"] == 200

    detail = client.get(f"/api/v1/assessments/{body['id']}", headers=auth)
    assert detail.status_code == 200
    assert detail.json()["result"]["structure"]["type"] == "pit"


def test_history_is_never_overwritten(client: TestClient, auth: dict[str, str]) -> None:
    property_id = client.post(
        "/api/v1/properties", headers=auth, json={"name": "Home"}
    ).json()["id"]

    for area in (200, 150):
        payload = {**REFERENCE, "segments": [{"label": "Main roof", "area_m2": area, "material": "tiles"}]}
        response = client.post(
            f"/api/v1/properties/{property_id}/assessments",
            headers=auth,
            json={"label": f"{area} m2", "payload": payload},
        )
        assert response.status_code == 201

    listed = client.get(f"/api/v1/properties/{property_id}/assessments", headers=auth).json()
    assert len(listed) == 2
    assert {item["label"] for item in listed} == {"200 m2", "150 m2"}


def test_another_user_cannot_read_the_assessment(
    client: TestClient, auth: dict[str, str]
) -> None:
    property_id = client.post(
        "/api/v1/properties", headers=auth, json={"name": "Home"}
    ).json()["id"]
    assessment_id = client.post(
        f"/api/v1/properties/{property_id}/assessments",
        headers=auth,
        json={"label": "Baseline", "payload": REFERENCE},
    ).json()["id"]

    other = register(client, "other@example.com").json()
    headers = {"Authorization": f"Bearer {other['access_token']}"}

    assert client.get(f"/api/v1/assessments/{assessment_id}", headers=headers).status_code == 404
    assert client.get("/api/v1/assessments", headers=headers).json() == []


def test_assessment_requires_sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/v1/properties/anything/assessments",
        json={"label": "x", "payload": REFERENCE},
    )
    assert response.status_code == 401


def test_archived_property_rejects_new_assessments(
    client: TestClient, auth: dict[str, str]
) -> None:
    property_id = client.post(
        "/api/v1/properties", headers=auth, json={"name": "Home"}
    ).json()["id"]
    client.delete(f"/api/v1/properties/{property_id}", headers=auth)

    response = client.post(
        f"/api/v1/properties/{property_id}/assessments",
        headers=auth,
        json={"label": "x", "payload": REFERENCE},
    )
    assert response.status_code == 409
