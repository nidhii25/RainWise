from __future__ import annotations

from uuid import uuid4

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Incremented on logout or password reset to revoke every issued token.
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    properties: Mapped[list["Property"]] = relationship(  # noqa: F821
        back_populates="owner", cascade="all, delete-orphan"
    )
