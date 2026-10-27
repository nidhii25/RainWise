"""Request models for the assessment calculation endpoint.

These mirror the engineering dataclasses but add validation at the API edge.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RoofSegmentIn(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    area_m2: float = Field(gt=0, le=100_000)
    material: str = Field(default="other", max_length=40)
    runoff_coefficient: float | None = Field(default=None, gt=0, le=1)
    area_method: str = Field(default="measured", max_length=20)


class RainfallIn(BaseModel):
    annual_mm: float = Field(ge=0, le=20_000)
    monthly_mm: list[float] | None = Field(default=None, min_length=12, max_length=12)
    source: str = Field(default="user", max_length=120)
    period: str = Field(default="annual", max_length=20)


class DemandIn(BaseModel):
    people: int = Field(default=4, ge=1, le=500)
    litres_per_person_per_day: float = Field(default=100.0, gt=0, le=1_000)


class SiteIn(BaseModel):
    infiltration_mm_per_hr: float | None = Field(default=None, ge=0, le=1_000)
    water_table_depth_m: float | None = Field(default=None, ge=0, le=500)
    contamination_distance_m: float | None = Field(default=None, ge=0, le=1_000)
    available_space_m2: float | None = Field(default=None, ge=0, le=100_000)
    slope_pct: float | None = Field(default=None, ge=-100, le=100)
    soil_class: str | None = Field(default=None, max_length=80)


class GeometryIn(BaseModel):
    eave_length_m: float | None = Field(default=None, gt=0, le=10_000)
    building_height_m: float = Field(default=6.0, gt=0, le=200)
    tank_distance_m: float = Field(default=5.0, ge=0, le=500)
    recharge_distance_m: float = Field(default=3.0, ge=0, le=500)


class AssessmentRequest(BaseModel):
    segments: list[RoofSegmentIn] = Field(min_length=1, max_length=50)
    rainfall: RainfallIn
    demand: DemandIn = Field(default_factory=DemandIn)
    site: SiteIn = Field(default_factory=SiteIn)
    geometry: GeometryIn = Field(default_factory=GeometryIn)
    target_reliability: float = Field(default=0.8, gt=0, le=1)
    region: str = Field(default="in", max_length=8, pattern=r"^[A-Za-z]{2,8}$")
