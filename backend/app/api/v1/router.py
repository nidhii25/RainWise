from fastapi import APIRouter
from pydantic import BaseModel

from app.api.v1.assessment import router as assessment_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.auth import router as auth_router
from app.api.v1.ai import router as ai_router
from app.api.v1.properties import router as properties_router


class HealthResponse(BaseModel):
    status: str
    service: str


router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="rainwise-api")


router.include_router(auth_router)
router.include_router(properties_router)
router.include_router(assessments_router)
router.include_router(assessment_router)
router.include_router(ai_router)
