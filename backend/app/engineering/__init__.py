"""RainWise engineering package.

Pure, deterministic calculations. This package must never import FastAPI,
SQLAlchemy, or anything that performs I/O. The only files it reads are the
versioned rule files under ``rules/``.
"""

from app.engineering.design import run_assessment
from app.engineering.types import (
    AssessmentInput,
    AssessmentResult,
    Demand,
    Geometry,
    Rainfall,
    RoofSegment,
    SiteConditions,
    Status,
)

__all__ = [
    "AssessmentInput",
    "AssessmentResult",
    "Demand",
    "Geometry",
    "Rainfall",
    "RoofSegment",
    "SiteConditions",
    "Status",
    "run_assessment",
]
