from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_property
from app.db.session import get_db
from app.engineering.serialize import jsonable
from app.models import Assessment, User
from app.schemas.property import AssessmentCreate, AssessmentDetail, AssessmentSummary
from app.services.assessment_service import execute

router = APIRouter(tags=["assessments"])


def _summary(record: Assessment) -> AssessmentSummary:
    return AssessmentSummary(
        id=record.id,
        property_id=record.property_id,
        label=record.label,
        system=record.system,
        recharge_status=record.recharge_status,
        annual_net_litres=record.annual_net_litres,
        tank_usable_m3=record.tank_usable_m3,
        method_version=record.method_version,
        created_at=record.created_at,
    )


def _detail(record: Assessment) -> AssessmentDetail:
    return AssessmentDetail(
        **_summary(record).model_dump(),
        input=record.input_json,
        result=record.result_json,
    )


@router.post(
    "/properties/{property_id}/assessments",
    response_model=AssessmentDetail,
    status_code=status.HTTP_201_CREATED,
)
def create_assessment(
    property_id: str,
    payload: AssessmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssessmentDetail:
    prop = get_owned_property(property_id, db, user)
    if prop.is_archived:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This property is archived. Restore it before adding an assessment.",
        )

    try:
        result = execute(payload.payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)
        ) from error

    record = Assessment(
        user_id=user.id,
        property_id=prop.id,
        label=payload.label.strip() or "Assessment",
        input_json=payload.payload.model_dump(mode="json"),
        result_json=jsonable(result),
        method_version=result.method_version,
        system=result.system,
        recharge_status=result.recharge.status.value,
        annual_net_litres=float(result.coverage.get("annual_net_litres", 0.0)),
        tank_usable_m3=float(result.coverage.get("tank_usable_m3", 0.0)),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _detail(record)


@router.get("/properties/{property_id}/assessments", response_model=list[AssessmentSummary])
def list_assessments(
    property_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssessmentSummary]:
    prop = get_owned_property(property_id, db, user)
    records = db.scalars(
        select(Assessment)
        .where(Assessment.property_id == prop.id, Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc())
    ).all()
    return [_summary(record) for record in records]


@router.get("/assessments", response_model=list[AssessmentSummary])
def list_all_assessments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssessmentSummary]:
    records = db.scalars(
        select(Assessment)
        .where(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc())
    ).all()
    return [_summary(record) for record in records]


@router.get("/assessments/{assessment_id}", response_model=AssessmentDetail)
def get_assessment(
    assessment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssessmentDetail:
    record = db.get(Assessment, assessment_id)
    if record is None or record.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found"
        )
    return _detail(record)
