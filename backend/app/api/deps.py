"""Shared API dependencies: authentication and ownership."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import Property, User

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise CREDENTIALS_ERROR

    try:
        payload = decode_token(credentials.credentials, "access")
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    user = db.get(User, str(payload["sub"]))
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    if int(payload.get("ver", -1)) != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked. Sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_owned_property(property_id: str, db: Session, user: User) -> Property:
    prop = db.get(Property, property_id)
    if prop is None or prop.user_id != user.id:
        # Do not reveal whether another user's property exists.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return prop
