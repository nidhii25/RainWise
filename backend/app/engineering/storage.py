"""Storage sizing by monthly water balance.

Annual yield cannot size a tank: a monsoon delivers most of the year's rain in
a few months, so the tank is driven by the dry-season carryover. The engine
simulates every month for a catalogue of buildable tank sizes and returns the
smallest one that meets the reliability target.
"""

from __future__ import annotations

import math
from dataclasses import replace

from app.engineering.types import StorageResult, TankOption, WarningItem

FREEB0ARD_M = 0.20
DEAD_STORAGE_M = 0.10
USABLE_LOSS_M = FREEB0ARD_M + DEAD_STORAGE_M


def _cylinder(
    diameter_m: float,
    height_m: float,
    *,
    shape: str,
    material: str,
    label: str,
) -> TankOption:
    area = math.pi / 4 * diameter_m**2
    gross = area * height_m
    usable = area * max(0.0, height_m - USABLE_LOSS_M)
    return TankOption(
        shape=shape,
        material=material,
        dimensions={"diameter_m": round(diameter_m, 2), "height_m": round(height_m, 2)},
        gross_m3=round(gross, 3),
        usable_m3=round(usable, 3),
        label=label,
    )


def _rectangular(
    length_m: float,
    width_m: float,
    height_m: float,
    *,
    material: str = "RCC",
    label: str = "",
) -> TankOption:
    gross = length_m * width_m * height_m
    usable = length_m * width_m * max(0.0, height_m - USABLE_LOSS_M)
    return TankOption(
        shape="rectangular",
        material=material,
        dimensions={
            "length_m": round(length_m, 2),
            "width_m": round(width_m, 2),
            "height_m": round(height_m, 2),
        },
        gross_m3=round(gross, 3),
        usable_m3=round(usable, 3),
        label=label or f"RCC rectangular {length_m:g} x {width_m:g} x {height_m:g} m",
    )


def tank_catalogue() -> tuple[TankOption, ...]:
    """Buildable tank sizes, sorted by usable volume."""
    options: list[TankOption] = []

    # Small HDPE cylinders.
    for diameter, height in ((0.8, 1.0), (1.0, 1.3), (1.2, 1.4), (1.3, 1.5)):
        options.append(
            _cylinder(
                diameter,
                height,
                shape="cylinder",
                material="HDPE",
                label=f"HDPE cylinder D{diameter:g} x H{height:g} m",
            )
        )

    # RCC / ferrocement cylinders, 2 to 15 m3.
    for diameter in (1.5, 2.0, 2.5):
        for height in (1.5, 2.0, 2.5):
            option = _cylinder(
                diameter,
                height,
                shape="cylinder",
                material="RCC",
                label=f"RCC cylinder D{diameter:g} x H{height:g} m",
            )
            if 1.5 <= option.gross_m3 <= 20.0:
                options.append(option)

    # Rectangular sums, 2 to 50 m3.
    for width in (1.0, 1.5, 2.0, 2.5, 3.0):
        for ratio in (1.0, 1.5, 2.0):
            length = round(width * ratio, 1)
            for height in (1.5, 2.0, 2.5):
                option = _rectangular(length, width, height)
                if 2.0 <= option.gross_m3 <= 50.0:
                    options.append(option)

    # Deduplicate near-identical usable volumes, keeping the smallest footprint.
    unique: dict[float, TankOption] = {}
    for option in sorted(options, key=lambda item: item.usable_m3):
        key = round(option.usable_m3, 1)
        unique.setdefault(key, option)

    return tuple(unique.values())


def simulate_monthly_balance(
    monthly_inflow_m3: tuple[float, ...],
    monthly_demand_m3: float,
    capacity_m3: float,
    *,
    warmup_years: int = 2,
) -> tuple[float, float, float, int]:
    """Run the monthly balance to a steady annual cycle.

    Order of operations is fixed and documented: inflow arrives, overflow
    spills, then demand is drawn. Storage can never go negative.

    The series is repeated for ``warmup_years`` before metrics are collected,
    so the result does not depend on the tank starting empty in January. Only
    the final 12 months are scored.

    Returns ``(reliability, overflow_m3, unmet_m3, months_empty)``.
    """
    if capacity_m3 <= 0:
        raise ValueError("Tank capacity must be positive")
    if len(monthly_inflow_m3) != 12:
        raise ValueError("Monthly inflow must contain exactly 12 values")
    if warmup_years < 0:
        raise ValueError("Warm-up years cannot be negative")

    stored = 0.0
    overflow_total = 0.0
    unmet_total = 0.0
    months_empty = 0
    scored_months = 12
    total_months = (warmup_years + 1) * 12

    for month in range(total_months):
        inflow = max(0.0, monthly_inflow_m3[month % 12])
        available = stored + inflow
        overflow = max(0.0, available - capacity_m3)
        stored_before_use = min(capacity_m3, available)
        actual_use = min(monthly_demand_m3, stored_before_use)
        stored = stored_before_use - actual_use

        if month >= total_months - scored_months:
            overflow_total += overflow
            unmet_total += monthly_demand_m3 - actual_use
            if stored <= 1e-9:
                months_empty += 1

    total_demand = monthly_demand_m3 * scored_months
    reliability = 0.0 if total_demand <= 0 else 1.0 - unmet_total / total_demand
    return (
        max(0.0, min(1.0, reliability)),
        round(overflow_total, 3),
        round(unmet_total, 3),
        months_empty,
    )


def size_storage(
    monthly_inflow_m3: tuple[float, ...] | None,
    monthly_demand_m3: float,
    *,
    target_reliability: float = 0.8,
    catalogue: tuple[TankOption, ...] | None = None,
) -> StorageResult:
    """Pick the smallest tank that meets the reliability target."""
    if not 0.0 < target_reliability <= 1.0:
        raise ValueError("Reliability target must be between 0 and 1")

    demand = monthly_demand_m3 * 12
    options = catalogue or tank_catalogue()

    if monthly_inflow_m3 is None:
        return StorageResult(
            demand_m3=round(demand, 3),
            recommended=None,
            options=(),
            target_reliability=target_reliability,
            warnings=(
                WarningItem(
                    code="storage_needs_monthly_rainfall",
                    message=(
                        "Tank sizing needs a monthly rainfall series. Only annual "
                        "yield can be reported without it."
                    ),
                ),
            ),
        )

    scored: list[TankOption] = []
    for option in options:
        reliability, overflow, unmet, months_empty = simulate_monthly_balance(
            monthly_inflow_m3, monthly_demand_m3, option.usable_m3
        )
        scored.append(
            replace(
                option,
                reliability=round(reliability, 4),
                overflow_m3=overflow,
                unmet_m3=unmet,
                months_empty=months_empty,
            )
        )

    recommended = next(
        (option for option in scored if (option.reliability or 0.0) >= target_reliability),
        None,
    )

    warnings: list[WarningItem] = []
    if recommended is None:
        recommended = scored[-1]
        warnings.append(
            WarningItem(
                code="tank_cannot_meet_target",
                message=(
                    f"No tank in the catalogue reaches {target_reliability:.0%} reliability. "
                    f"The largest practical tank ({recommended.usable_m3:.1f} m3 usable) "
                    f"reaches {(recommended.reliability or 0.0):.0%}. Route overflow to recharge "
                    f"or reduce demand."
                ),
            )
        )

    return StorageResult(
        demand_m3=round(demand, 3),
        recommended=recommended,
        options=tuple(scored),
        target_reliability=target_reliability,
        warnings=tuple(warnings),
    )


def sweep_summary(options: tuple[TankOption, ...]) -> list[dict[str, float]]:
    """Compact curve for the frontend chart."""
    return [
        {
            "usable_m3": option.usable_m3,
            "reliability": option.reliability or 0.0,
            "overflow_m3": option.overflow_m3 or 0.0,
        }
        for option in options
        if option.reliability is not None
    ]
