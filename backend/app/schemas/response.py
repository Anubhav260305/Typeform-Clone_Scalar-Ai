from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AnswerCreate(BaseModel):
    question_id: int
    value: Any


class ResponseSubmit(BaseModel):
    answers: list[AnswerCreate] = Field(default_factory=list)


ResponseCreate = ResponseSubmit


class AnswerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    response_id: int
    question_id: int
    value: Any
    created_at: datetime


class AnswerDetail(BaseModel):
    id: int
    question_id: int
    question_title: str
    question_type: str
    value: Any


class ResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    form_id: int
    submitted_at: datetime
    created_at: datetime


class ResponseDetail(BaseModel):
    id: int
    form_id: int
    submitted_at: datetime
    created_at: datetime
    answers: list[AnswerDetail] = Field(default_factory=list)


class ResponseCount(BaseModel):
    count: int
