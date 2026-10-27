from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.assessment import AssessmentRequest


class PropertyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    address: str = Field(default="", max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    notes: str = Field(default="", max_length=2000)


class PropertyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    notes: str | None = Field(default=None, max_length=2000)
    is_archived: bool | None = None


class PropertyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    address: str
    latitude: float | None
    longitude: float | None
    notes: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class AssessmentCreate(BaseModel):
    label: str = Field(default="", max_length=120)
    payload: AssessmentRequest


class AssessmentSummary(BaseModel):
    id: str
    property_id: str
    label: str
    system: str
    recharge_status: str
    annual_net_litres: float
    tank_usable_m3: float
    method_version: str
    created_at: datetime


class AssessmentDetail(AssessmentSummary):
    input: dict
    result: dict
