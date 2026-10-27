"""Loader for the versioned engineering rule files.

Rules live in YAML so a threshold can be corrected and cited without editing
Python. Loading is cached per process.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.engineering.types import SourceRef

RULES_DIR = Path(__file__).parent / "rules"


@dataclass(frozen=True)
class Coefficient:
    key: str
    value: float
    source: SourceRef
    status: str
    note: str


@dataclass(frozen=True)
class CoefficientTable:
    version: int
    default_key: str
    coefficients: dict[str, Coefficient]

    def resolve(self, material: str) -> tuple[Coefficient, bool]:
        """Return the coefficient and whether a fallback was used."""
        key = (material or "").strip().lower()
        if key in self.coefficients:
            return self.coefficients[key], False
        return self.coefficients[self.default_key], True


@dataclass(frozen=True)
class RechargeCriterion:
    id: str
    label: str
    input_field: str
    operator: str
    threshold: float | None
    unit: str | None
    on_unknown: str
    source: SourceRef | None
    message: str


@dataclass(frozen=True)
class DesignDefaults:
    intensity_mm_per_hr: float
    duration_h: float
    void_ratio_pit: float
    void_ratio_trench: float
    void_ratio_shaft: float
    water_table_clearance_m: float
    percolation_safety_factor: float
    pit_threshold_mm_per_hr: float
    trench_threshold_mm_per_hr: float
    max_pit_depth_m: float
    max_trench_depth_m: float
    max_shaft_depth_m: float


@dataclass(frozen=True)
class RechargeRuleSet:
    version: int
    region: str
    name: str
    criteria: tuple[RechargeCriterion, ...]
    design: DesignDefaults
    sources: dict[str, SourceRef]


def _source(key: str, data: dict[str, Any]) -> SourceRef:
    return SourceRef(
        key=key,
        title=str(data.get("title", key)),
        publisher=str(data.get("publisher", "")),
        year=data.get("year"),
        locator=data.get("locator"),
        url=data.get("url"),
        status=str(data.get("status", "verified")),
    )


def _read(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle)
    if not isinstance(loaded, dict):
        raise ValueError(f"Rule file {path} did not contain a mapping")
    return loaded


@lru_cache(maxsize=1)
def load_coefficients() -> CoefficientTable:
    data = _read(RULES_DIR / "coefficients.yaml")
    sources = {key: _source(key, value) for key, value in data["sources"].items()}
    coefficients: dict[str, Coefficient] = {}
    for key, raw in data["coefficients"].items():
        coefficients[key] = Coefficient(
            key=key,
            value=float(raw["value"]),
            source=sources[raw["source"]],
            status=str(raw.get("status", "pending")),
            note=str(raw.get("note", "")),
        )
    return CoefficientTable(
        version=int(data.get("version", 1)),
        default_key=str(data.get("default", "other")),
        coefficients=coefficients,
    )


@lru_cache(maxsize=8)
def load_recharge_rules(region: str = "in") -> RechargeRuleSet:
    path = RULES_DIR / region / "cgwb-2007.yaml"
    if not path.exists():
        raise FileNotFoundError(f"No recharge rule pack for region '{region}'")

    data = _read(path)
    sources = {key: _source(key, value) for key, value in data["sources"].items()}

    criteria = tuple(
        RechargeCriterion(
            id=str(raw["id"]),
            label=str(raw["label"]),
            input_field=str(raw["input"]),
            operator=str(raw["operator"]),
            threshold=float(raw["threshold"]) if raw.get("threshold") is not None else None,
            unit=raw.get("unit"),
            on_unknown=str(raw.get("on_unknown", "insufficient")),
            source=sources.get(str(raw["source"])) if raw.get("source") else None,
            message=str(raw.get("message", "")),
        )
        for raw in data["criteria"]
    )

    design_raw = data["design"]
    design = DesignDefaults(
        intensity_mm_per_hr=float(design_raw["intensity_mm_per_hr"]),
        duration_h=float(design_raw["duration_h"]),
        void_ratio_pit=float(design_raw["void_ratio_pit"]),
        void_ratio_trench=float(design_raw["void_ratio_trench"]),
        void_ratio_shaft=float(design_raw["void_ratio_shaft"]),
        water_table_clearance_m=float(design_raw["water_table_clearance_m"]),
        percolation_safety_factor=float(design_raw["percolation_safety_factor"]),
        pit_threshold_mm_per_hr=float(design_raw["pit_threshold_mm_per_hr"]),
        trench_threshold_mm_per_hr=float(design_raw["trench_threshold_mm_per_hr"]),
        max_pit_depth_m=float(design_raw["max_pit_depth_m"]),
        max_trench_depth_m=float(design_raw["max_trench_depth_m"]),
        max_shaft_depth_m=float(design_raw["max_shaft_depth_m"]),
    )

    return RechargeRuleSet(
        version=int(data.get("version", 1)),
        region=str(data.get("region", region.upper())),
        name=str(data.get("name", "Unnamed rule pack")),
        criteria=criteria,
        design=design,
        sources=sources,
    )
