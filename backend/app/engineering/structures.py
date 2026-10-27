"""Recharge structure selection and sizing.

Each structure type has its own geometry and its own percolation check. The
engine never reuses the tank formula for a recharge structure.
"""

from __future__ import annotations

import math

from app.engineering.rules import RechargeRuleSet, load_recharge_rules
from app.engineering.types import MediaLayer, SiteConditions, StructureOption
from app.engineering.units import mm_per_hour_to_m_per_hour

STANDARD_MEDIA: tuple[MediaLayer, ...] = (
    MediaLayer(order=1, thickness_mm=150, material="Coarse sand"),
    MediaLayer(order=2, thickness_mm=300, material="20 mm gravel"),
    MediaLayer(order=3, thickness_mm=300, material="40 mm gravel"),
    MediaLayer(order=4, thickness_mm=0, material="50-100 mm boulders (remaining depth)"),
)


def _fraction(working_volume: float, percolation_rate: float, duration_h: float, design_volume: float) -> float:
    if design_volume <= 0:
        return 1.0
    handled = working_volume + percolation_rate * duration_h
    return min(1.0, handled / design_volume)


def _choose(candidates: list[StructureOption]) -> StructureOption | None:
    if not candidates:
        return None
    sufficient = [item for item in candidates if item.fraction_handled >= 1.0]
    if sufficient:
        return min(sufficient, key=lambda item: item.working_volume_m3)
    return max(candidates, key=lambda item: (item.fraction_handled, -item.working_volume_m3))


def select_structure(
    site: SiteConditions,
    design_volume_m3: float,
    *,
    ruleset: RechargeRuleSet | None = None,
) -> StructureOption | None:
    """Choose and size a recharge structure, or return ``None`` if none fits."""
    rules = ruleset or load_recharge_rules()
    design = rules.design

    if site.infiltration_mm_per_hr is None or site.water_table_depth_m is None:
        return None
    if design_volume_m3 <= 0:
        return None

    clearance_limit = site.water_table_depth_m - design.water_table_clearance_m
    if clearance_limit < 1.5:
        return None

    space = site.available_space_m2 or 0.0
    k_m_per_h = mm_per_hour_to_m_per_hour(site.infiltration_mm_per_hr)
    safety = design.percolation_safety_factor

    if site.infiltration_mm_per_hr >= design.pit_threshold_mm_per_hr and space >= 4.0:
        structure_type = "pit"
    elif site.infiltration_mm_per_hr >= design.trench_threshold_mm_per_hr:
        structure_type = "trench"
    else:
        structure_type = "shaft"

    candidates: list[StructureOption] = []

    if structure_type == "pit":
        max_depth = min(design.max_pit_depth_m, clearance_limit)
        for side in (1.0, 1.5, 2.0, 2.5, 3.0):
            if side * side > space:
                continue
            for depth in (1.5, 2.0, 2.5, 3.0):
                if depth > max_depth:
                    continue
                working = side * side * depth * design.void_ratio_pit
                wetted = side * side + 4 * side * depth
                percolation = k_m_per_h * wetted / safety
                candidates.append(
                    StructureOption(
                        type="pit",
                        shape="square",
                        dimensions={
                            "length_m": side,
                            "width_m": side,
                            "depth_m": depth,
                        },
                        depth_m=depth,
                        working_volume_m3=round(working, 3),
                        design_volume_m3=round(design_volume_m3, 3),
                        percolation_m3_per_hr=round(percolation, 3),
                        fraction_handled=round(
                            _fraction(working, percolation, design.duration_h, design_volume_m3), 3
                        ),
                        clearance_above_water_table_m=round(
                            site.water_table_depth_m - depth, 2
                        ),
                        media_layers=STANDARD_MEDIA,
                        note="Media-filled masonry pit with a removable cover.",
                    )
                )

    elif structure_type == "trench":
        max_depth = min(design.max_trench_depth_m, clearance_limit)
        for width in (0.6, 0.8, 1.0):
            for length in range(2, 21):
                if width * length > space:
                    continue
                for depth in (1.5, 2.0, 2.5):
                    if depth > max_depth:
                        continue
                    working = width * length * depth * design.void_ratio_trench
                    wetted = width * length + 2 * length * depth + 2 * width * depth
                    percolation = k_m_per_h * wetted / safety
                    candidates.append(
                        StructureOption(
                            type="trench",
                            shape="rectangular",
                            dimensions={
                                "length_m": float(length),
                                "width_m": width,
                                "depth_m": depth,
                            },
                            depth_m=depth,
                            working_volume_m3=round(working, 3),
                            design_volume_m3=round(design_volume_m3, 3),
                            percolation_m3_per_hr=round(percolation, 3),
                            fraction_handled=round(
                                _fraction(working, percolation, design.duration_h, design_volume_m3), 3
                            ),
                            clearance_above_water_table_m=round(
                                site.water_table_depth_m - depth, 2
                            ),
                            media_layers=STANDARD_MEDIA,
                            note="Media-filled trench along the available strip.",
                        )
                    )

    else:
        max_depth = min(design.max_shaft_depth_m, clearance_limit)
        for diameter in (0.9, 1.2, 1.5):
            for depth in range(3, int(math.floor(max_depth)) + 1):
                area = math.pi / 4 * diameter**2
                working = area * depth * design.void_ratio_shaft
                wetted = math.pi * diameter * depth + area
                percolation = k_m_per_h * wetted / safety
                candidates.append(
                    StructureOption(
                        type="shaft",
                        shape="circular",
                        dimensions={"diameter_m": diameter, "depth_m": float(depth)},
                        depth_m=float(depth),
                        working_volume_m3=round(working, 3),
                        design_volume_m3=round(design_volume_m3, 3),
                        percolation_m3_per_hr=round(percolation, 3),
                        fraction_handled=round(
                            _fraction(working, percolation, design.duration_h, design_volume_m3), 3
                        ),
                        clearance_above_water_table_m=round(
                            site.water_table_depth_m - depth, 2
                        ),
                        media_layers=(),
                        note=(
                            "Open shaft for low-permeability ground. Requires professional "
                            "review before construction."
                        ),
                    )
                )

    return _choose(candidates)


def design_storm_volume(area_m2: float, coefficient: float, ruleset: RechargeRuleSet | None = None) -> float:
    """Runoff volume from the design storm, in cubic metres."""
    rules = ruleset or load_recharge_rules()
    design = rules.design
    return area_m2 * coefficient * design.intensity_mm_per_hr * design.duration_h / 1000.0
