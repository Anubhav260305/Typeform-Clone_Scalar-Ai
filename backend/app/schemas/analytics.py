from pydantic import BaseModel, ConfigDict, Field


class AnalyticsQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    question_id: int
    question_title: str
    question_type: str
    response_count: int
    average: float | None = None
    minimum: float | None = None
    maximum: float | None = None
    distribution: dict[str, int] | None = None


class AnalyticsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    form_id: int
    total_responses: int
    questions: list[AnalyticsQuestion] = Field(default_factory=list)
