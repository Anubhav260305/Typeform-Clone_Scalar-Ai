from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.response import Response


class AnalyticsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_total_responses(self, form_id: int) -> int:
        statement = select(func.count(Response.id)).where(Response.form_id == form_id)
        return self.db.scalar(statement) or 0

    def get_answers_for_form(self, form_id: int) -> list[tuple[int, Any]]:
        """Returns list of (question_id, value) tuples for all responses to form_id."""
        statement = (
            select(Answer.question_id, Answer.value)
            .join(Response, Answer.response_id == Response.id)
            .where(Response.form_id == form_id)
        )
        return [(row[0], row[1]) for row in self.db.execute(statement).all()]
