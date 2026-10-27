from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models import User
from app.services.ai_concept import generate_concept

router = APIRouter(prefix="/ai", tags=["ai"])


class ConceptRequest(BaseModel):
    system: str = Field(max_length=40)
    tank_label: str | None = Field(default=None, max_length=120)
    structure_type: str | None = Field(default=None, max_length=40)
    notes: list[str] = Field(default_factory=list, max_length=20)


@router.post("/concept")
def concept(
    payload: ConceptRequest,
    _user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Generate an illustrative concept render. Never changes a dimension."""
    return generate_concept(
        system=payload.system,
        tank_label=payload.tank_label,
        structure_type=payload.structure_type,
        notes=payload.notes,
    )
