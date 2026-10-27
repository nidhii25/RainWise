"""JSON-safe serialisation for engineering results."""

from __future__ import annotations

from dataclasses import fields, is_dataclass
from enum import Enum
from typing import Any


def jsonable(value: Any) -> Any:
    """Recursively convert dataclasses, enums, tuples, and mappings to JSON types."""
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value) and not isinstance(value, type):
        return {field.name: jsonable(getattr(value, field.name)) for field in fields(value)}
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [jsonable(item) for item in value]
    return value
