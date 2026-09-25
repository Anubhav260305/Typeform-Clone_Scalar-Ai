from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FormCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)


class FormUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    status: str | None = Field(None, pattern="^(draft|published)$")


class FormRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    status: str
    created_at: datetime
    updated_at: datetime
    response_count: int = 0


class PublicQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    description: str | None = None
    required: bool
    order_index: int
    settings: dict[str, Any] | None = None


class PublicFormRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    questions: list[PublicQuestionRead] = Field(default_factory=list)
