"""Recharge feasibility.

A rule table is walked criterion by criterion. Every criterion returns
pass, fail, or unknown, and the overall status is derived from those results.
A missing value is never treated as a pass.
"""

from __future__ import annotations

from app.engineering.rules import RechargeCriterion, RechargeRuleSet, load_recharge_rules
from app.engineering.types import (
    CriterionEvaluation,
    CriterionResult,
    RechargeResult,
    SiteConditions,
    Status,
    WarningItem,
)

_OPERATOR_LABEL = {
    "gte": ">=",
    "lte": "<=",
    "gt": ">",
    "lt": "<",
    "present": "provided",
}


def _threshold_text(criterion: RechargeCriterion) -> str | None:
    if criterion.operator == "present":
        return "provided"
    if criterion.threshold is None:
        return None
    unit = f" {criterion.unit}" if criterion.unit else ""
    return f"{_OPERATOR_LABEL.get(criterion.operator, criterion.operator)} {criterion.threshold:g}{unit}"


def _evaluate_one(criterion: RechargeCriterion, value: float | None) -> CriterionResult:
    if value is None:
        return CriterionResult.REVIEW if criterion.on_unknown == "review" else CriterionResult.UNKNOWN

    if criterion.operator == "present":
        return CriterionResult.PASS

    if criterion.threshold is None:
        return CriterionResult.REVIEW

    threshold = criterion.threshold
    if criterion.operator == "gte":
        return CriterionResult.PASS if value >= threshold else CriterionResult.FAIL
    if criterion.operator == "lte":
        return CriterionResult.PASS if value <= threshold else CriterionResult.FAIL
    if criterion.operator == "gt":
        return CriterionResult.PASS if value > threshold else CriterionResult.FAIL
    if criterion.operator == "lt":
        return CriterionResult.PASS if value < threshold else CriterionResult.FAIL
    raise ValueError(f"Unknown rule operator '{criterion.operator}'")


def evaluate_recharge(
    site: SiteConditions,
    ruleset: RechargeRuleSet | None = None,
) -> RechargeResult:
    """Evaluate every recharge criterion and return the overall status."""
    rules = ruleset or load_recharge_rules()

    evaluations: list[CriterionEvaluation] = []
    missing: list[str] = []
    failures: list[str] = []

    for criterion in rules.criteria:
        raw = getattr(site, criterion.input_field, None)
        value = float(raw) if raw is not None else None
        result = _evaluate_one(criterion, value)

        evaluations.append(
            CriterionEvaluation(
                id=criterion.id,
                label=criterion.label,
                value=value,
                unit=criterion.unit,
                result=result,
                threshold=_threshold_text(criterion),
                source=criterion.source,
                note=criterion.message if result in (CriterionResult.UNKNOWN, CriterionResult.REVIEW) else None,
            )
        )

        if result in (CriterionResult.UNKNOWN, CriterionResult.REVIEW):
            missing.append(f"{criterion.label}: {criterion.message}".strip())
        elif result is CriterionResult.FAIL:
            failures.append(
                f"{criterion.label} is {value:g}{(' ' + criterion.unit) if criterion.unit else ''}, "
                f"which does not meet {_threshold_text(criterion)}."
            )

    results = {item.result for item in evaluations}
    if CriterionResult.FAIL in results:
        status = Status.NOT_ELIGIBLE
    elif CriterionResult.UNKNOWN in results:
        # Missing required data is a stronger statement than "needs review".
        status = Status.INSUFFICIENT_DATA
    elif CriterionResult.REVIEW in results:
        status = Status.REVIEW_REQUIRED
    else:
        status = Status.ELIGIBLE

    reasons: list[str] = []
    if status is Status.ELIGIBLE:
        reasons.append("All required criteria passed.")
    if failures:
        reasons.extend(failures)
    if missing:
        reasons.extend(f"Needs input: {item}" for item in missing)

    warnings: list[WarningItem] = []
    if status is Status.REVIEW_REQUIRED:
        warnings.append(
            WarningItem(
                code="recharge_review_required",
                message="One or more criteria could not be decided from the available data.",
            )
        )

    return RechargeResult(
        status=status,
        criteria=tuple(evaluations),
        missing=tuple(missing),
        reasons=tuple(reasons),
        warnings=tuple(warnings),
    )
