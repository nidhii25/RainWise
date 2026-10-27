"""API-level tests for the calculation endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

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


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_reference_assessment_returns_a_complete_result() -> None:
    response = client.post("/api/v1/assessments/calculate", json=REFERENCE)
    assert response.status_code == 200

    body = response.json()
    assert body["system"] == "storage_and_recharge"
    assert body["coverage"]["annual_net_litres"] == 143412.0
    assert body["recharge"]["status"] == "ELIGIBLE"
    assert body["structure"]["type"] == "pit"
    assert body["piping"]
    assert body["quantities"]


def test_missing_site_data_returns_insufficient_data() -> None:
    payload = {**REFERENCE, "site": {}}
    response = client.post("/api/v1/assessments/calculate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["recharge"]["status"] == "INSUFFICIENT_DATA"
    assert body["structure"] is None
    assert body["rooftop"]["net_m3"] > 0


def test_unknown_region_returns_review_required() -> None:
    payload = {**REFERENCE, "region": "other"}
    response = client.post("/api/v1/assessments/calculate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["recharge"]["status"] == "REVIEW_REQUIRED"
    assert body["structure"] is None
    assert body["rooftop"]["net_m3"] > 0
    assert body["storage"]["recommended"] is not None
    assert body["recharge"]["warnings"][0]["code"] == "recharge_rule_pack_missing"


def test_region_path_traversal_is_rejected() -> None:
    payload = {**REFERENCE, "region": "../in"}
    assert client.post("/api/v1/assessments/calculate", json=payload).status_code == 422


def test_region_is_case_insensitive() -> None:
    payload = {**REFERENCE, "region": "IN"}
    response = client.post("/api/v1/assessments/calculate", json=payload)
    assert response.status_code == 200
    assert response.json()["recharge"]["status"] == "ELIGIBLE"


def test_zero_area_is_rejected() -> None:
    payload = {**REFERENCE, "segments": [{"label": "Roof", "area_m2": 0, "material": "tiles"}]}
    assert client.post("/api/v1/assessments/calculate", json=payload).status_code == 422


def test_eleven_month_values_are_rejected() -> None:
    payload = {**REFERENCE, "rainfall": {"annual_mm": 900, "monthly_mm": [1] * 11}}
    assert client.post("/api/v1/assessments/calculate", json=payload).status_code == 422


def test_rules_endpoint_exposes_sources() -> None:
    response = client.get("/api/v1/engineering/rules")
    assert response.status_code == 200

    body = response.json()
    assert body["coefficients"]["tiles"]["value"] == 0.85
    assert body["recharge"]["region"] == "IN"
    assert any(item["id"] == "water_table_depth" for item in body["recharge"]["criteria"])
