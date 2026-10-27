"""Rooftop runoff and loss calculations.

Formula (handoff section 6.1):

    V_runoff_m3 = sum(P_mm * A_i_m2 * C_i) / 1000

Losses are kept separate so nothing is double counted (handoff section 6.2).
"""

from __future__ import annotations

from app.engineering.rules import CoefficientTable, load_coefficients
from app.engineering.types import Rainfall, RoofSegment, RooftopResult, Severity, WarningItem
from app.engineering.units import rainfall_volume_m3

#: First-flush depth diverted per rainfall event, in mm.
DEFAULT_FIRST_FLUSH_MM = 1.0

#: Filter and conveyance loss, as a fraction of the runoff after first flush.
DEFAULT_FILTER_LOSS_FRACTION = 0.05


def compute_rooftop(
    segments: tuple[RoofSegment, ...],
    rainfall: Rainfall,
    *,
    first_flush_mm: float = DEFAULT_FIRST_FLUSH_MM,
    filter_loss_fraction: float = DEFAULT_FILTER_LOSS_FRACTION,
    coefficients: CoefficientTable | None = None,
) -> RooftopResult:
    """Compute gross rainfall, runoff, losses, and net collectible volume."""
    if not segments:
        raise ValueError("At least one roof segment is required")
    if rainfall.annual_mm < 0:
        raise ValueError("Rainfall cannot be negative")
    if rainfall.monthly_mm is not None and len(rainfall.monthly_mm) != 12:
        raise ValueError("Monthly rainfall must contain exactly 12 values")
    if not 0.0 <= filter_loss_fraction < 1.0:
        raise ValueError("Filter loss fraction must be between 0 and 1")

    table = coefficients or load_coefficients()
    warnings: list[WarningItem] = []

    total_area = 0.0
    gross_rainfall = 0.0
    runoff = 0.0
    first_flush = 0.0
    monthly_runoff = [0.0] * 12
    monthly_first_flush = [0.0] * 12

    for segment in segments:
        if segment.area_m2 <= 0:
            raise ValueError(f"Segment '{segment.label}' has a non-positive area")

        coefficient, used_fallback = table.resolve(segment.material)
        if used_fallback:
            warnings.append(
                WarningItem(
                    code="coefficient_fallback",
                    message=(
                        f"Unknown roof material '{segment.material}' on segment "
                        f"'{segment.label}'. Used the conservative default of "
                        f"{coefficient.value}."
                    ),
                )
            )

        c = segment.runoff_coefficient if segment.runoff_coefficient is not None else coefficient.value
        if not 0.0 < c <= 1.0:
            raise ValueError(f"Runoff coefficient for '{segment.label}' must be between 0 and 1")

        if coefficient.status != "verified" and segment.runoff_coefficient is None:
            warnings.append(
                WarningItem(
                    code="coefficient_pending",
                    message=(
                        f"Coefficient {c} for '{segment.material}' is a RainWise design value "
                        f"inside the cited range. The exact value is not a direct table entry; "
                        f"professional review is pending. See docs/ENGINEERING_METHODOLOGY.md."
                    ),
                    severity=Severity.INFO,
                )
            )

        total_area += segment.area_m2
        gross_rainfall += rainfall_volume_m3(rainfall.annual_mm, segment.area_m2)
        runoff += rainfall_volume_m3(rainfall.annual_mm, segment.area_m2) * c

        if rainfall.monthly_mm is not None:
            for month, depth in enumerate(rainfall.monthly_mm):
                monthly_first_flush[month] += rainfall_volume_m3(min(first_flush_mm, depth), segment.area_m2) * c
                monthly_runoff[month] += rainfall_volume_m3(depth, segment.area_m2) * c
        else:
            # No monthly series: assume one first-flush event per month.
            first_flush += rainfall_volume_m3(first_flush_mm, segment.area_m2) * c * 12

    if rainfall.monthly_mm is not None:
        first_flush = sum(monthly_first_flush)

    after_first_flush = max(0.0, runoff - first_flush)
    filter_loss = after_first_flush * filter_loss_fraction
    net = after_first_flush - filter_loss

    monthly_net: tuple[float, ...] | None = None
    if rainfall.monthly_mm is not None:
        monthly_net = tuple(
            max(0.0, monthly_runoff[month] - monthly_first_flush[month])
            * (1.0 - filter_loss_fraction)
            for month in range(12)
        )

    return RooftopResult(
        area_m2=round(total_area, 3),
        gross_rainfall_m3=round(gross_rainfall, 3),
        runoff_m3=round(runoff, 3),
        first_flush_m3=round(first_flush, 3),
        filter_loss_m3=round(filter_loss, 3),
        net_m3=round(net, 3),
        monthly_net_m3=monthly_net,
        warnings=tuple(warnings),
    )
