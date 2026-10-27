from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_owned_property
from app.db.session import get_db
from app.models import Property, User
from app.schemas.property import PropertyCreate, PropertyOut, PropertyUpdate

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=list[PropertyOut])
def list_properties(
    include_archived: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Property]:
    statement = select(Property).where(Property.user_id == user.id)
    if not include_archived:
        statement = statement.where(Property.is_archived.is_(False))
    return list(db.scalars(statement.order_by(Property.created_at.desc())).all())


@router.post("", response_model=PropertyOut, status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Property:
    prop = Property(
        user_id=user.id,
        name=payload.name.strip(),
        address=payload.address.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        notes=payload.notes.strip(),
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(
    property_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Property:
    return get_owned_property(property_id, db, user)


@router.patch("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: str,
    payload: PropertyUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Property:
    prop = get_owned_property(property_id, db, user)
    changes = payload.model_dump(exclude_unset=True)

    for field in ("name", "address", "notes"):
        if field in changes and changes[field] is not None:
            changes[field] = str(changes[field]).strip()

    if "name" in changes and not changes["name"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Property name cannot be empty.",
        )

    for field, value in changes.items():
        setattr(prop, field, value)
    db.commit()
    db.refresh(prop)
    return prop


@router.delete("/{property_id}", response_model=PropertyOut)
def archive_property(
    property_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Property:
    """Archive a property. Assessments are kept as history."""
    prop = get_owned_property(property_id, db, user)
    prop.is_archived = True
    db.commit()
    db.refresh(prop)
    return prop
