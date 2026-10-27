"""Piping and component sizing.

Sizes follow the rules in docs/DESIGN_RULES.md section 4. Lengths are derived
from the roof geometry and the chosen structure positions, so the user does not
type them in.
"""

from __future__ import annotations

import math

from app.engineering.types import Geometry, PipeLine, StructureOption, TankOption
from app.engineering.units import m3_to_litres, rainfall_volume_m3

GUTTER_DIAMETER_MM = 150
RECHARGE_INLET_MM = 160


def downpipe_count(roof_area_m2: float) -> int:
    """One downpipe per 60 m2, minimum one."""
    return max(1, math.ceil(roof_area_m2 / 60.0))


def downpipe_diameter(roof_area_m2: float) -> int:
    if roof_area_m2 <= 50:
        return 75
    if roof_area_m2 <= 120:
        return 90
    return 110


def first_flush_volume_litres(roof_area_m2: float, first_flush_mm: float = 1.0) -> float:
    return m3_to_litres(rainfall_volume_m3(first_flush_mm, roof_area_m2))


def eave_length(roof_area_m2: float, geometry: Geometry) -> float:
    """Gutter run. Falls back to two sides of a square roof."""
    if geometry.eave_length_m:
        return geometry.eave_length_m
    return round(2.0 * math.sqrt(roof_area_m2), 1)


def build_piping(
    roof_area_m2: float,
    geometry: Geometry,
    tank: TankOption | None,
    structure: StructureOption | None,
) -> tuple[PipeLine, ...]:
    diameter = downpipe_diameter(roof_area_m2)
    count = downpipe_count(roof_area_m2)
    lines: list[PipeLine] = [
        PipeLine(
            id="P1",
            purpose="Roof gutter",
            from_point="Roof eave",
            to_point="Downpipe head",
            diameter_mm=GUTTER_DIAMETER_MM,
            length_m=eave_length(roof_area_m2, geometry),
            slope="1:200",
        ),
        PipeLine(
            id="P2",
            purpose="Downpipe",
            from_point="Gutter outlet",
            to_point="First-flush diverter",
            diameter_mm=diameter,
            length_m=round(geometry.building_height_m * count, 1),
            slope="vertical",
        ),
        PipeLine(
            id="P3",
            purpose="First flush to filter",
            from_point="First-flush diverter",
            to_point="Filter chamber",
            diameter_mm=diameter,
            length_m=1.5,
            slope="1:100",
        ),
    ]

    if tank is not None:
        lines.append(
            PipeLine(
                id="P4",
                purpose="Filtered inlet to tank",
                from_point="Filter chamber",
                to_point="Tank inlet",
                diameter_mm=max(90, diameter),
                length_m=round(geometry.tank_distance_m, 1),
                slope="1:100",
            )
        )
        if structure is not None:
            lines.append(
                PipeLine(
                    id="P5",
                    purpose="Tank overflow to recharge",
                    from_point="Tank overflow",
                    to_point="Recharge silt trap",
                    diameter_mm=max(110, diameter),
                    length_m=round(geometry.recharge_distance_m, 1),
                    slope="1:100",
                )
            )
    elif structure is not None:
        lines.append(
            PipeLine(
                id="P4",
                purpose="Filtered inlet direct to recharge",
                from_point="Filter chamber",
                to_point="Recharge silt trap",
                diameter_mm=RECHARGE_INLET_MM,
                length_m=round(geometry.recharge_distance_m, 1),
                slope="1:100",
            )
        )

    if structure is not None:
        lines.append(
            PipeLine(
                id="P6",
                purpose="Recharge inlet",
                from_point="Silt trap",
                to_point=f"{structure.type.title()} inlet",
                diameter_mm=RECHARGE_INLET_MM,
                length_m=2.0,
                slope="1:100",
            )
        )

    return tuple(lines)


def pipe_totals(lines: tuple[PipeLine, ...]) -> dict[int, float]:
    """Total pipe length by diameter, in metres."""
    totals: dict[int, float] = {}
    for line in lines:
        totals[line.diameter_mm] = round(totals.get(line.diameter_mm, 0.0) + line.length_m, 1)
    return totals
