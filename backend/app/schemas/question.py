from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

SUPPORTED_QUESTION_TYPES: tuple[str, ...] = (
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
)


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: str = Field(...)
    description: str | None = None
    required: bool = False
    order_index: int | None = Field(None, ge=0)
    settings: dict[str, Any] | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("title cannot be empty or whitespace only")
        return stripped

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in SUPPORTED_QUESTION_TYPES:
            raise ValueError(
                f"Invalid question type '{v}'. Supported types: {', '.join(SUPPORTED_QUESTION_TYPES)}"
            )
        return v


class QuestionUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    type: str | None = None
    description: str | None = None
    required: bool | None = None
    order_index: int | None = Field(None, ge=0)
    settings: dict[str, Any] | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("title cannot be empty or whitespace only")
            return stripped
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str | None) -> str | None:
        if v is not None and v not in SUPPORTED_QUESTION_TYPES:
            raise ValueError(
                f"Invalid question type '{v}'. Supported types: {', '.join(SUPPORTED_QUESTION_TYPES)}"
            )
        return v


class QuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int
    type: str
    title: str
    description: str | None
    required: bool
    order_index: int
    settings: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class QuestionReorder(BaseModel):
    question_ids: list[int] = Field(..., min_length=1)
