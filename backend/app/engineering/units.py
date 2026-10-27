"""Unit helpers.

Every conversion lives here so a formula never contains a bare 1000.
"""

from __future__ import annotations

LITRES_PER_CUBIC_METRE = 1000.0
MM_PER_METRE = 1000.0
SECONDS_PER_HOUR = 3600.0


def rainfall_volume_m3(depth_mm: float, area_m2: float) -> float:
    """Volume of rain falling on an area.

    ``1 mm`` over ``1 m2`` is ``1 litre``, so ``mm * m2 / 1000`` gives m3.
    """
    return depth_mm * area_m2 / MM_PER_METRE


def m3_to_litres(volume_m3: float) -> float:
    return volume_m3 * LITRES_PER_CUBIC_METRE


def litres_to_m3(volume_litres: float) -> float:
    return volume_litres / LITRES_PER_CUBIC_METRE


def mm_per_hour_to_m_per_hour(rate_mm_per_hour: float) -> float:
    return rate_mm_per_hour / MM_PER_METRE


def round_m3(value: float, digits: int = 3) -> float:
    return round(value, digits)
