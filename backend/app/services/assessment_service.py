"""Convert API payloads into engineering inputs and run the engine."""

from __future__ import annotations

from app.engineering import (
    AssessmentInput,
    AssessmentResult,
    Demand,
    Geometry,
    Rainfall,
    RoofSegment,
    SiteConditions,
)
from app.engineering.design import run_assessment
from app.schemas.assessment import AssessmentRequest


def build_input(payload: AssessmentRequest) -> AssessmentInput:
    return AssessmentInput(
        segments=tuple(
            RoofSegment(
                label=segment.label,
                area_m2=segment.area_m2,
                material=segment.material,
                runoff_coefficient=segment.runoff_coefficient,
                area_method=segment.area_method,
            )
            for segment in payload.segments
        ),
        rainfall=Rainfall(
            annual_mm=payload.rainfall.annual_mm,
            monthly_mm=(
                tuple(payload.rainfall.monthly_mm)
                if payload.rainfall.monthly_mm is not None
                else None
            ),
            source=payload.rainfall.source,
            period=payload.rainfall.period,
        ),
        demand=Demand(
            people=payload.demand.people,
            litres_per_person_per_day=payload.demand.litres_per_person_per_day,
        ),
        site=SiteConditions(
            infiltration_mm_per_hr=payload.site.infiltration_mm_per_hr,
            water_table_depth_m=payload.site.water_table_depth_m,
            contamination_distance_m=payload.site.contamination_distance_m,
            available_space_m2=payload.site.available_space_m2,
            slope_pct=payload.site.slope_pct,
            soil_class=payload.site.soil_class,
        ),
        geometry=Geometry(
            eave_length_m=payload.geometry.eave_length_m,
            building_height_m=payload.geometry.building_height_m,
            tank_distance_m=payload.geometry.tank_distance_m,
            recharge_distance_m=payload.geometry.recharge_distance_m,
        ),
        target_reliability=payload.target_reliability,
        region=payload.region.lower(),
    )


def execute(payload: AssessmentRequest) -> AssessmentResult:
    return run_assessment(build_input(payload))
