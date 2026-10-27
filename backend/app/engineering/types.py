"""Typed inputs and outputs for the engineering package.

These are plain dataclasses, not Pydantic models, so the calculation layer
stays independent of the web framework.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Status(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    CONDITIONALLY_ELIGIBLE = "CONDITIONALLY_ELIGIBLE"
    NOT_ELIGIBLE = "NOT_ELIGIBLE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class CriterionResult(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    UNKNOWN = "unknown"
    REVIEW = "review"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass(frozen=True)
class SourceRef:
    """A citable source. ``locator`` is the table, page, or section."""

    key: str
    title: str
    publisher: str
    year: int | None = None
    locator: str | None = None
    url: str | None = None
    status: str = "verified"


@dataclass(frozen=True)
class WarningItem:
    code: str
    message: str
    severity: Severity = Severity.WARNING


@dataclass(frozen=True)
class RoofSegment:
    label: str
    area_m2: float
    material: str = "other"
    runoff_coefficient: float | None = None
    area_method: str = "measured"


@dataclass(frozen=True)
class Rainfall:
    annual_mm: float
    monthly_mm: tuple[float, ...] | None = None
    source: str = "user"
    period: str = "annual"


@dataclass(frozen=True)
class Demand:
    people: int = 4
    litres_per_person_per_day: float = 100.0

    @property
    def annual_m3(self) -> float:
        return self.people * self.litres_per_person_per_day * 365 / 1000

    @property
    def monthly_m3(self) -> float:
        return self.annual_m3 / 12


@dataclass(frozen=True)
class SiteConditions:
    infiltration_mm_per_hr: float | None = None
    water_table_depth_m: float | None = None
    contamination_distance_m: float | None = None
    available_space_m2: float | None = None
    slope_pct: float | None = None
    soil_class: str | None = None


@dataclass(frozen=True)
class Geometry:
    """Site measurements used to compute pipe lengths."""

    eave_length_m: float | None = None
    building_height_m: float = 6.0
    tank_distance_m: float = 5.0
    recharge_distance_m: float = 3.0


@dataclass(frozen=True)
class TankOption:
    shape: str
    material: str
    dimensions: dict[str, float]
    gross_m3: float
    usable_m3: float
    reliability: float | None = None
    overflow_m3: float | None = None
    unmet_m3: float | None = None
    months_empty: int | None = None
    label: str = ""


@dataclass(frozen=True)
class StorageResult:
    demand_m3: float
    recommended: TankOption | None
    options: tuple[TankOption, ...]
    target_reliability: float
    warnings: tuple[WarningItem, ...] = ()


@dataclass(frozen=True)
class RooftopResult:
    area_m2: float
    gross_rainfall_m3: float
    runoff_m3: float
    first_flush_m3: float
    filter_loss_m3: float
    net_m3: float
    monthly_net_m3: tuple[float, ...] | None
    warnings: tuple[WarningItem, ...] = ()


@dataclass(frozen=True)
class CriterionEvaluation:
    id: str
    label: str
    value: float | None
    unit: str | None
    result: CriterionResult
    threshold: str | None
    source: SourceRef | None
    note: str | None = None


@dataclass(frozen=True)
class RechargeResult:
    status: Status
    criteria: tuple[CriterionEvaluation, ...]
    missing: tuple[str, ...]
    reasons: tuple[str, ...]
    warnings: tuple[WarningItem, ...] = ()


@dataclass(frozen=True)
class MediaLayer:
    order: int
    thickness_mm: int
    material: str


@dataclass(frozen=True)
class StructureOption:
    type: str
    shape: str
    dimensions: dict[str, float]
    depth_m: float
    working_volume_m3: float
    design_volume_m3: float
    percolation_m3_per_hr: float
    fraction_handled: float
    clearance_above_water_table_m: float
    media_layers: tuple[MediaLayer, ...] = ()
    note: str | None = None


@dataclass(frozen=True)
class PipeLine:
    id: str
    purpose: str
    from_point: str
    to_point: str
    diameter_mm: int
    length_m: float
    slope: str


@dataclass(frozen=True)
class QuantityItem:
    item: str
    unit: str
    quantity: float
    note: str | None = None


@dataclass(frozen=True)
class AssessmentInput:
    segments: tuple[RoofSegment, ...]
    rainfall: Rainfall
    demand: Demand = field(default_factory=Demand)
    site: SiteConditions = field(default_factory=SiteConditions)
    geometry: Geometry = field(default_factory=Geometry)
    target_reliability: float = 0.8
    region: str = "in"


@dataclass(frozen=True)
class AssessmentResult:
    rooftop: RooftopResult
    storage: StorageResult
    recharge: RechargeResult
    structure: StructureOption | None
    system: str
    piping: tuple[PipeLine, ...]
    quantities: tuple[QuantityItem, ...]
    warnings: tuple[WarningItem, ...]
    sources: tuple[SourceRef, ...]
    method_version: str
    coverage: dict[str, float] = field(default_factory=dict)
    notes: tuple[str, ...] = ()
