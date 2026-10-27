"""Assessment orchestration.

This is the single entry point the API calls. It wires the pure calculations
together and returns one typed result.
"""

from __future__ import annotations

from dataclasses import replace

from app.engineering.piping import build_piping, first_flush_volume_litres
from app.engineering.quantities import build_quantities
from app.engineering.recharge import evaluate_recharge
from app.engineering.rooftop import compute_rooftop
from app.engineering.rules import RechargeRuleSet, load_coefficients, load_recharge_rules
from app.engineering.storage import size_storage
from app.engineering.structures import design_storm_volume, select_structure
from app.engineering.types import (
    AssessmentInput,
    AssessmentResult,
    CriterionEvaluation,
    CriterionResult,
    RechargeResult,
    Severity,
    SourceRef,
    Status,
    WarningItem,
)
from app.engineering.units import m3_to_litres

METHOD_VERSION = "rainwise-1.0"


def _dedupe_sources(sources: list[SourceRef]) -> tuple[SourceRef, ...]:
    seen: dict[str, SourceRef] = {}
    for source in sources:
        seen.setdefault(source.key, source)
    return tuple(seen.values())


def _weighted_coefficient(data: AssessmentInput) -> float:
    table = load_coefficients()
    weighted = 0.0
    area = 0.0
    for segment in data.segments:
        coefficient = (
            segment.runoff_coefficient
            if segment.runoff_coefficient is not None
            else table.resolve(segment.material)[0].value
        )
        weighted += segment.area_m2 * coefficient
        area += segment.area_m2
    return weighted / area if area else 0.0


def run_assessment(
    data: AssessmentInput,
    ruleset: RechargeRuleSet | None = None,
) -> AssessmentResult:
    """Run every calculation and return a complete assessment result."""
    try:
        rules = ruleset or load_recharge_rules(data.region)
    except FileNotFoundError:
        rules = None

    table = load_coefficients()

    rooftop = compute_rooftop(data.segments, data.rainfall, coefficients=table)
    storage = size_storage(
        rooftop.monthly_net_m3,
        data.demand.monthly_m3,
        target_reliability=data.target_reliability,
    )

    structure = None
    design_volume = 0.0
    if rules is None:
        recharge = RechargeResult(
            status=Status.REVIEW_REQUIRED,
            criteria=(
                CriterionEvaluation(
                    id="recharge_rule_pack",
                    label="Recharge rule pack",
                    value=None,
                    unit=None,
                    result=CriterionResult.REVIEW,
                    threshold=None,
                    source=None,
                    note=f"No recharge rule pack is available for region '{data.region}'.",
                ),
            ),
            missing=(),
            reasons=(
                f"No recharge rule pack is available for region '{data.region}'. "
                "Rooftop yield and tank sizing are unaffected; recharge cannot be assessed.",
            ),
            warnings=(
                WarningItem(
                    code="recharge_rule_pack_missing",
                    message=(
                        f"No recharge rule pack for region '{data.region}'. "
                        "Recharge is marked REVIEW_REQUIRED; only yield and tank sizing are reported."
                    ),
                    severity=Severity.WARNING,
                ),
            ),
        )
    else:
        recharge = evaluate_recharge(data.site, rules)
        design_volume = design_storm_volume(
            rooftop.area_m2, _weighted_coefficient(data), rules
        )
        if recharge.status in (Status.ELIGIBLE, Status.CONDITIONALLY_ELIGIBLE):
            structure = select_structure(data.site, design_volume, ruleset=rules)
            if (
                structure is not None
                and structure.fraction_handled < 1.0
                and recharge.status is Status.ELIGIBLE
            ):
                recharge = replace(
                    recharge,
                    status=Status.CONDITIONALLY_ELIGIBLE,
                    reasons=recharge.reasons
                    + (
                        f"The selected structure handles {structure.fraction_handled:.0%} of the design "
                        f"storm; the remainder must overflow to a drain.",
                    ),
                )

    tank = storage.recommended
    tank_meets_target = tank is not None and (tank.reliability or 0.0) >= data.target_reliability

    if tank_meets_target:
        system = "storage_only"
    elif structure is not None:
        system = "storage_and_recharge" if tank is not None else "recharge_only"
    elif tank is not None:
        system = "storage_only"
    else:
        system = "none"

    piping = build_piping(rooftop.area_m2, data.geometry, tank, structure)
    quantities = build_quantities(tank, structure, piping)

    warnings: list[WarningItem] = [
        *rooftop.warnings,
        *storage.warnings,
        *recharge.warnings,
    ]
    notes: list[str] = []

    if tank is not None and not tank_meets_target:
        if structure is not None:
            notes.append(
                f"The recommended tank supplies {(tank.reliability or 0.0):.0%} of demand, below the "
                f"{data.target_reliability:.0%} target. The remaining runoff is routed to recharge."
            )
        else:
            notes.append(
                f"The recommended tank supplies {(tank.reliability or 0.0):.0%} of demand, below the "
                f"{data.target_reliability:.0%} target. The remaining runoff is not routed to a sized "
                "recharge structure."
            )
    if tank is not None:
        notes.append(
            f"Tank: {tank.label}, {tank.usable_m3:.2f} m3 usable "
            f"({m3_to_litres(tank.usable_m3):,.0f} litres)."
        )
    if structure is not None:
        notes.append(
            f"Recharge {structure.type}: {structure.working_volume_m3:.2f} m3 working volume, "
            f"handles {structure.fraction_handled:.0%} of the design storm."
        )
        if structure.type == "shaft":
            warnings.append(
                WarningItem(
                    code="shaft_requires_review",
                    message=(
                        "A recharge shaft needs professional review before construction, "
                        "because it may cross a low-permeability layer."
                    ),
                    severity=Severity.ERROR,
                )
            )
    if system == "none":
        warnings.append(
            WarningItem(
                code="no_system_recommended",
                message=(
                    "No storage or recharge system could be sized from the available data. "
                    "Review the missing inputs listed in the recharge criteria."
                ),
                severity=Severity.ERROR,
            )
        )
    if rooftop.monthly_net_m3 is None:
        notes.append("Monthly rainfall was not available, so tank sizing was skipped.")

    coverage = {
        "annual_net_litres": round(m3_to_litres(rooftop.net_m3), 0),
        "first_flush_litres": round(first_flush_volume_litres(rooftop.area_m2), 0),
        "tank_usable_m3": round(tank.usable_m3, 2) if tank else 0.0,
        "tank_reliability": round(tank.reliability or 0.0, 4) if tank else 0.0,
        "tank_overflow_litres": round(m3_to_litres(tank.overflow_m3 or 0.0), 0) if tank else 0.0,
        "design_storm_m3": round(design_volume, 2),
        "recharge_fraction": round(structure.fraction_handled, 3) if structure else 0.0,
        "recharge_volume_m3": round(structure.working_volume_m3, 2) if structure else 0.0,
    }

    sources = _dedupe_sources(
        [coefficient.source for coefficient in table.coefficients.values()]
        + (list(rules.sources.values()) if rules is not None else [])
    )

    return AssessmentResult(
        rooftop=rooftop,
        storage=storage,
        recharge=recharge,
        structure=structure,
        system=system,
        piping=piping,
        quantities=quantities,
        warnings=tuple(warnings),
        sources=sources,
        method_version=METHOD_VERSION,
        coverage=coverage,
        notes=tuple(notes),
    )
