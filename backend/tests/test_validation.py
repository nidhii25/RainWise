"""Validation, ownership, and AI endpoint edge cases."""

from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient

from app.core.config import settings

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


def test_property_rejects_out_of_range_values(
    client: TestClient, auth: dict[str, str]
) -> None:
    cases = [
        {"name": ""},
        {"name": "Home", "latitude": 91},
        {"name": "Home", "latitude": -91},
        {"name": "Home", "longitude": 181},
        {"name": "Home", "longitude": -181},
    ]

    for payload in cases:
        response = client.post("/api/v1/properties", headers=auth, json=payload)
        assert response.status_code == 422, (payload, response.text)


def test_saved_assessment_rejects_an_incomplete_series(
    client: TestClient, auth: dict[str, str]
) -> None:
    property_id = client.post(
        "/api/v1/properties", headers=auth, json={"name": "Home"}
    ).json()["id"]

    payload = deepcopy(REFERENCE)
    payload["rainfall"]["monthly_mm"] = [1] * 11

    response = client.post(
        f"/api/v1/properties/{property_id}/assessments",
        headers=auth,
        json={"label": "Broken", "payload": payload},
    )
    assert response.status_code == 422


def test_ai_concept_requires_sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/v1/ai/concept",
        json={"system": "storage_only", "tank_label": None, "structure_type": None},
    )
    assert response.status_code == 401


def test_ai_concept_reports_disabled_when_unconfigured(
    client: TestClient, auth: dict[str, str], monkeypatch
) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", "")

    response = client.post(
        "/api/v1/ai/concept",
        headers=auth,
        json={
            "system": "storage_and_recharge",
            "tank_label": "RCC rectangular 6 x 3 x 2.5 m",
            "structure_type": "pit",
            "notes": ["Overflow is routed to the pit."],
        },
    )
    assert response.status_code == 200

    body = response.json()
    assert body["configured"] is False
    assert body["image_data_url"] is None
    assert "disabled" in body["message"].lower()
