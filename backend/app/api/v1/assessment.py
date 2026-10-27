"""Assessment calculation endpoint.

This is a preview endpoint: it runs the engine and returns the result without
persisting anything. Persistence arrives with the assessment data model.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.engineering.rules import load_coefficients, load_recharge_rules
from app.engineering.serialize import jsonable
from app.schemas.assessment import AssessmentRequest
from app.services.assessment_service import execute

router = APIRouter(tags=["assessment"])


@router.post("/assessments/calculate")
def calculate_assessment(payload: AssessmentRequest) -> dict[str, Any]:
    """Run the full assessment without saving it.

    Saving a run requires a property and a signed-in user.
    """
    try:
        result = execute(payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return jsonable(result)


@router.get("/engineering/rules")
def engineering_rules() -> dict[str, Any]:
    """Expose the active rule versions and their sources."""
    coefficients = load_coefficients()
    recharge = load_recharge_rules()

    return {
        "coefficient_version": coefficients.version,
        "coefficients": {
            key: {
                "value": coefficient.value,
                "status": coefficient.status,
                "source": jsonable(coefficient.source),
            }
            for key, coefficient in coefficients.coefficients.items()
        },
        "recharge": {
            "version": recharge.version,
            "region": recharge.region,
            "name": recharge.name,
            "criteria": [
                {
                    "id": criterion.id,
                    "label": criterion.label,
                    "operator": criterion.operator,
                    "threshold": criterion.threshold,
                    "unit": criterion.unit,
                    "on_unknown": criterion.on_unknown,
                    "source": jsonable(criterion.source) if criterion.source else None,
                }
                for criterion in recharge.criteria
            ],
            "design": jsonable(recharge.design),
        },
    }
