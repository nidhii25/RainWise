"""Approximate bill of quantities.

No costs. The purpose is to tell the user what materials and volumes the
recommended design needs, so a contractor can quote against it.
"""

from __future__ import annotations

import math

from app.engineering.piping import pipe_totals
from app.engineering.types import PipeLine, QuantityItem, StructureOption, TankOption

WALL_THICKNESS_M = 0.15
BASE_THICKNESS_M = 0.10
COVER_THICKNESS_M = 0.10
MASONRY_THICKNESS_M = 0.23
MASONRY_SOLID_FRACTION = 0.6


def _tank_quantities(tank: TankOption) -> tuple[float, float]:
    """Return (excavation_m3, rcc_m3)."""
    dims = tank.dimensions
    if tank.shape == "rectangular":
        length = dims["length_m"]
        width = dims["width_m"]
        height = dims["height_m"]
        gross = length * width * height
        walls = 2 * (length + width) * height * WALL_THICKNESS_M
        base = length * width * BASE_THICKNESS_M
        cover = length * width * COVER_THICKNESS_M
        return gross, walls + base + cover

    diameter = dims["diameter_m"]
    height = dims["height_m"]
    gross = math.pi / 4 * diameter**2 * height
    shell = math.pi * diameter * height * WALL_THICKNESS_M
    base = math.pi / 4 * diameter**2 * BASE_THICKNESS_M
    cover = math.pi / 4 * diameter**2 * COVER_THICKNESS_M
    return 0.0, shell + base + cover


def _structure_quantities(structure: StructureOption) -> tuple[float, float, float, float]:
    """Return (excavation_m3, masonry_m3, media_m3, geotextile_m2)."""
    dims = structure.dimensions
    if structure.shape == "circular":
        diameter = dims["diameter_m"]
        depth = dims["depth_m"]
        area = math.pi / 4 * diameter**2
        perimeter = math.pi * diameter
    else:
        length = dims["length_m"]
        width = dims["width_m"]
        depth = dims["depth_m"]
        area = length * width
        perimeter = 2 * (length + width)

    excavation = area * depth
    masonry = perimeter * depth * MASONRY_THICKNESS_M * MASONRY_SOLID_FRACTION

    # Media fills the working volume of a media-filled structure.
    media = structure.working_volume_m3 if structure.type in ("pit", "trench") else 0.0
    geotextile = area + perimeter * depth
    return excavation, masonry, media, geotextile


def build_quantities(
    tank: TankOption | None,
    structure: StructureOption | None,
    piping: tuple[PipeLine, ...],
) -> tuple[QuantityItem, ...]:
    items: list[QuantityItem] = []
    excavation = 0.0
    rcc = 0.0

    if tank is not None:
        tank_excavation, tank_rcc = _tank_quantities(tank)
        excavation += tank_excavation
        rcc += tank_rcc
        items.append(
            QuantityItem(
                item=f"Tank: {tank.label}",
                unit="m3 gross",
                quantity=tank.gross_m3,
                note=f"{tank.usable_m3:.2f} m3 usable",
            )
        )

    if structure is not None:
        struct_excavation, masonry, media, geotextile = _structure_quantities(structure)
        excavation += struct_excavation
        items.append(
            QuantityItem(
                item=f"Recharge {structure.type} excavation",
                unit="m3",
                quantity=round(struct_excavation, 2),
            )
        )
        items.append(
            QuantityItem(
                item="Pit/trench masonry lining",
                unit="m3",
                quantity=round(masonry, 2),
                note="Masonry with 20-25% voids",
            )
        )
        if media > 0:
            items.append(
                QuantityItem(
                    item="Filter media (sand, gravel, boulders)",
                    unit="m3",
                    quantity=round(media, 2),
                )
            )
        items.append(
            QuantityItem(
                item="Geotextile",
                unit="m2",
                quantity=round(geotextile, 2),
            )
        )

    if excavation > 0:
        items.insert(
            0,
            QuantityItem(item="Total excavation", unit="m3", quantity=round(excavation, 2)),
        )
    if rcc > 0:
        items.append(QuantityItem(item="RCC (walls, base, cover)", unit="m3", quantity=round(rcc, 2)))

    for diameter, length in sorted(pipe_totals(piping).items()):
        items.append(
            QuantityItem(
                item=f"PVC pipe {diameter} mm",
                unit="m",
                quantity=round(length, 1),
            )
        )

    return tuple(items)
