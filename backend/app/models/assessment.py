from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin


class Assessment(Base, TimestampMixin):
    """An immutable calculation run.

    The full input and result are stored as JSON snapshots, so a later change to
    a coefficient or a rule pack never rewrites history.
    """

    __tablename__ = "assessments"
    __table_args__ = (Index("ix_assessments_property_created", "property_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    property_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("properties.id", ondelete="CASCADE"), index=True, nullable=False
    )
    label: Mapped[str] = mapped_column(String(120), default="", nullable=False)

    input_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    method_version: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    system: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    recharge_status: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    annual_net_litres: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tank_usable_m3: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    property: Mapped["Property"] = relationship(back_populates="assessments")  # noqa: F821


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
