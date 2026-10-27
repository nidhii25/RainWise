"""Tests for the RainWise engineering package.

The reference example is the one in docs/USER_FLOW.md: a 200 m2 tiled roof in a
900 mm/year rainfall area, household of four.
"""

from __future__ import annotations

import pytest

from app.engineering import AssessmentInput, Demand, Geometry, Rainfall, RoofSegment, SiteConditions
from app.engineering.design import run_assessment
from app.engineering.piping import build_piping, downpipe_count, downpipe_diameter
from app.engineering.recharge import evaluate_recharge
from app.engineering.rooftop import compute_rooftop
from app.engineering.serialize import jsonable
from app.engineering.storage import size_storage, simulate_monthly_balance, tank_catalogue
from app.engineering.structures import design_storm_volume, select_structure
from app.engineering.types import CriterionResult, Status

MONTHLY = (5.0, 5.0, 5.0, 5.0, 10.0, 140.0, 300.0, 250.0, 130.0, 35.0, 10.0, 5.0)


def reference_segments() -> tuple[RoofSegment, ...]:
    return (RoofSegment(label="Main roof", area_m2=200.0, material="tiles"),)


# ---------------------------------------------------------------------------
# Rooftop
# ---------------------------------------------------------------------------


def test_reference_runoff_matches_hand_calculation() -> None:
    result = compute_rooftop(reference_segments(), Rainfall(annual_mm=900.0))

    # 900 mm * 200 m2 = 180 m3 of rain; at C = 0.85 -> 153 m3.
    assert result.gross_rainfall_m3 == pytest.approx(180.0)
    assert result.runoff_m3 == pytest.approx(153.0)
    # One first-flush event per month at 1 mm, times C.
    assert result.first_flush_m3 == pytest.approx(2.04)
    # 5% filter loss on the remainder.
    assert result.filter_loss_m3 == pytest.approx(7.548)
    assert result.net_m3 == pytest.approx(143.412)


def test_monthly_series_sums_to_annual() -> None:
    result = compute_rooftop(reference_segments(), Rainfall(annual_mm=900.0, monthly_mm=MONTHLY))

    assert result.monthly_net_m3 is not None
    assert len(result.monthly_net_m3) == 12
    assert sum(result.monthly_net_m3) == pytest.approx(result.net_m3, abs=0.01)


def test_multiple_segments_are_summed() -> None:
    segments = (
        RoofSegment(label="A", area_m2=100.0, material="tiles"),
        RoofSegment(label="B", area_m2=100.0, material="metal"),
    )
    result = compute_rooftop(segments, Rainfall(annual_mm=900.0))

    expected_runoff = 900 * 100 * 0.85 / 1000 + 900 * 100 * 0.90 / 1000
    assert result.runoff_m3 == pytest.approx(expected_runoff)


def test_unknown_material_falls_back_with_a_warning() -> None:
    result = compute_rooftop(
        (RoofSegment(label="Shed", area_m2=50.0, material="thatch"),),
        Rainfall(annual_mm=900.0),
    )
    assert any(warning.code == "coefficient_fallback" for warning in result.warnings)


def test_negative_rainfall_is_rejected() -> None:
    with pytest.raises(ValueError):
        compute_rooftop(reference_segments(), Rainfall(annual_mm=-1.0))


def test_monthly_series_must_have_twelve_values() -> None:
    with pytest.raises(ValueError):
        compute_rooftop(reference_segments(), Rainfall(annual_mm=900.0, monthly_mm=(1.0, 2.0)))


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def test_storage_reliability_is_monotonic_in_capacity() -> None:
    inflow = compute_rooftop(reference_segments(), Rainfall(annual_mm=900.0, monthly_mm=MONTHLY)).monthly_net_m3
    assert inflow is not None
    demand = 12.17

    reliabilities = [
        simulate_monthly_balance(inflow, demand, capacity)[0]
        for capacity in (1, 2, 5, 10, 20, 40, 80)
    ]

    assert reliabilities == sorted(reliabilities)
    assert reliabilities[-1] >= reliabilities[0]


def test_storage_balance_never_exceeds_inflow() -> None:
    inflow = compute_rooftop(reference_segments(), Rainfall(annual_mm=900.0, monthly_mm=MONTHLY)).monthly_net_m3
    assert inflow is not None

    reliability, overflow, unmet, months_empty = simulate_monthly_balance(inflow, 12.17, 10.0)

    assert 0.0 <= reliability <= 1.0
    assert overflow <= sum(inflow) + 1e-9
    assert unmet <= 12.17 * 12 + 1e-9
    assert 0 <= months_empty <= 12


def test_storage_recommends_the_smallest_tank_meeting_the_target() -> None:
    inflow = compute_rooftop(reference_segments(), Rainfall(annual_mm=900.0, monthly_mm=MONTHLY)).monthly_net_m3
    assert inflow is not None

    # A smaller household demand so a catalogue tank can reach the target.
    result = size_storage(inflow, 3.0, target_reliability=0.8)

    assert result.recommended is not None
    meeting = [option for option in result.options if (option.reliability or 0.0) >= 0.8]
    assert meeting
    assert result.recommended.usable_m3 == min(option.usable_m3 for option in meeting)


def test_storage_without_monthly_rainfall_refuses_to_size() -> None:
    result = size_storage(None, 12.17)

    assert result.recommended is None
    assert result.warnings[0].code == "storage_needs_monthly_rainfall"


def test_catalogue_is_sorted_and_unique() -> None:
    catalogue = tank_catalogue()
    volumes = [option.usable_m3 for option in catalogue]

    assert volumes == sorted(volumes)
    assert len(volumes) == len(set(round(volume, 1) for volume in volumes))


# ---------------------------------------------------------------------------
# Recharge
# ---------------------------------------------------------------------------


def complete_site() -> SiteConditions:
    return SiteConditions(
        infiltration_mm_per_hr=25.0,
        water_table_depth_m=12.0,
        contamination_distance_m=30.0,
        available_space_m2=20.0,
        slope_pct=2.0,
    )


def test_recharge_eligible_when_every_criterion_passes() -> None:
    result = evaluate_recharge(complete_site())
    assert result.status is Status.ELIGIBLE
    assert all(item.result is CriterionResult.PASS for item in result.criteria)


def test_missing_infiltration_is_insufficient_not_a_pass() -> None:
    site = SiteConditions(
        water_table_depth_m=12.0,
        contamination_distance_m=30.0,
        available_space_m2=20.0,
        slope_pct=2.0,
    )
    result = evaluate_recharge(site)

    assert result.status is Status.INSUFFICIENT_DATA
    assert any("infiltration" in item.lower() for item in result.missing)


def test_shallow_water_table_is_not_eligible() -> None:
    site = SiteConditions(
        infiltration_mm_per_hr=25.0,
        water_table_depth_m=2.0,
        contamination_distance_m=30.0,
        available_space_m2=20.0,
        slope_pct=2.0,
    )
    result = evaluate_recharge(site)

    assert result.status is Status.NOT_ELIGIBLE
    assert any(item.result is CriterionResult.FAIL for item in result.criteria)


def test_contamination_within_setback_is_not_eligible() -> None:
    site = SiteConditions(
        infiltration_mm_per_hr=25.0,
        water_table_depth_m=12.0,
        contamination_distance_m=5.0,
        available_space_m2=20.0,
        slope_pct=2.0,
    )
    assert evaluate_recharge(site).status is Status.NOT_ELIGIBLE


def test_unknown_soft_criterion_requires_review() -> None:
    site = SiteConditions(
        infiltration_mm_per_hr=25.0,
        water_table_depth_m=12.0,
        contamination_distance_m=30.0,
        available_space_m2=20.0,
        slope_pct=None,
    )
    assert evaluate_recharge(site).status is Status.REVIEW_REQUIRED


# ---------------------------------------------------------------------------
# Structures
# ---------------------------------------------------------------------------


def test_permeable_soil_selects_a_pit() -> None:
    structure = select_structure(complete_site(), design_storm_volume(200.0, 0.85))

    assert structure is not None
    assert structure.type == "pit"
    assert structure.fraction_handled <= 1.0
    assert structure.clearance_above_water_table_m >= 3.0


def test_low_permeability_selects_a_shaft() -> None:
    site = SiteConditions(
        infiltration_mm_per_hr=4.0,
        water_table_depth_m=20.0,
        contamination_distance_m=30.0,
        available_space_m2=20.0,
        slope_pct=2.0,
    )
    structure = select_structure(site, design_storm_volume(200.0, 0.85))

    assert structure is not None
    assert structure.type == "shaft"


def test_structure_never_goes_below_the_water_table() -> None:
    site = SiteConditions(
        infiltration_mm_per_hr=25.0,
        water_table_depth_m=5.0,
        contamination_distance_m=30.0,
        available_space_m2=20.0,
        slope_pct=2.0,
    )
    structure = select_structure(site, design_storm_volume(200.0, 0.85))

    assert structure is not None
    assert structure.depth_m <= 5.0 - 3.0
    assert structure.clearance_above_water_table_m >= 3.0


def test_no_structure_without_site_data() -> None:
    assert select_structure(SiteConditions(), 8.5) is None


# ---------------------------------------------------------------------------
# Piping
# ---------------------------------------------------------------------------


def test_downpipe_rules() -> None:
    assert downpipe_count(200.0) == 4
    assert downpipe_diameter(40.0) == 75
    assert downpipe_diameter(100.0) == 90
    assert downpipe_diameter(200.0) == 110


def test_piping_includes_recharge_lines_when_a_structure_exists() -> None:
    structure = select_structure(complete_site(), design_storm_volume(200.0, 0.85))
    lines = build_piping(200.0, Geometry(), tank=None, structure=structure)

    ids = {line.id for line in lines}
    assert {"P1", "P2", "P3", "P4", "P6"} <= ids
    assert all(line.length_m > 0 for line in lines)


# ---------------------------------------------------------------------------
# End to end
# ---------------------------------------------------------------------------


def full_input() -> AssessmentInput:
    return AssessmentInput(
        segments=reference_segments(),
        rainfall=Rainfall(annual_mm=900.0, monthly_mm=MONTHLY),
        demand=Demand(people=4, litres_per_person_per_day=100.0),
        site=complete_site(),
    )


def test_end_to_end_produces_a_complete_recommendation() -> None:
    result = run_assessment(full_input())

    assert result.system in {"storage_only", "storage_and_recharge", "recharge_only"}
    assert result.storage.recommended is not None
    assert result.recharge.status in {Status.ELIGIBLE, Status.CONDITIONALLY_ELIGIBLE}
    assert result.structure is not None
    assert result.piping
    assert result.quantities
    assert result.method_version
    assert result.coverage["annual_net_litres"] > 0


def test_end_to_end_is_json_serialisable() -> None:
    payload = jsonable(run_assessment(full_input()))

    assert payload["system"] in {"storage_only", "storage_and_recharge", "recharge_only"}
    assert isinstance(payload["recharge"]["status"], str)
    assert payload["coverage"]["annual_net_litres"] > 0


def test_missing_site_data_still_returns_yield() -> None:
    result = run_assessment(
        AssessmentInput(
            segments=reference_segments(),
            rainfall=Rainfall(annual_mm=900.0, monthly_mm=MONTHLY),
            site=SiteConditions(),
        )
    )

    assert result.rooftop.net_m3 > 0
    assert result.recharge.status is Status.INSUFFICIENT_DATA
    assert result.structure is None
    assert result.system == "storage_only"
