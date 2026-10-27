"""Password hashing and JSON Web Tokens.

Argon2id is used for passwords. Tokens carry a type claim and the user's token
version, so a logout or password change can invalidate every issued token.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

TokenType = Literal["access", "refresh"]

_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def create_token(
    user_id: str,
    token_type: TokenType,
    token_version: int,
    *,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta is None:
        expires_delta = (
            timedelta(minutes=settings.access_token_minutes)
            if token_type == "access"
            else timedelta(days=settings.refresh_token_days)
        )
    payload: dict[str, Any] = {
        "sub": user_id,
        "type": token_type,
        "ver": token_version,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "jti": secrets.token_urlsafe(12),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    """Decode and validate a token, raising ``ValueError`` on any problem."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as error:
        raise ValueError("Token has expired") from error
    except jwt.InvalidTokenError as error:
        raise ValueError("Token is not valid") from error

    if payload.get("type") != expected_type:
        raise ValueError(f"Expected a {expected_type} token")
    if not payload.get("sub"):
        raise ValueError("Token has no subject")
    return payload


def new_reset_token() -> tuple[str, str]:
    """Return ``(plain_token, sha256_hash)`` for a password reset."""
    plain = secrets.token_urlsafe(32)
    return plain, hashlib.sha256(plain.encode("utf-8")).hexdigest()


def hash_reset_token(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()
