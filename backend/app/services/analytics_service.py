from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.question import Question
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.form_repository import FormRepository
from app.repositories.question_repository import QuestionRepository
from app.schemas.analytics import AnalyticsQuestion, AnalyticsResponse


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.form_repository = FormRepository(db)
        self.question_repository = QuestionRepository(db)
        self.analytics_repository = AnalyticsRepository(db)

    def get_form_analytics(self, form_id: int) -> AnalyticsResponse:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")

        total_responses = self.analytics_repository.get_total_responses(form_id)
        questions = self.question_repository.get_by_form(form_id)
        answers_data = self.analytics_repository.get_answers_for_form(form_id)

        # Group non-null answer values by question_id
        answers_by_question: dict[int, list[Any]] = {}
        for q_id, val in answers_data:
            if val is not None:
                answers_by_question.setdefault(q_id, []).append(val)

        question_stats: list[AnalyticsQuestion] = []
        for q in questions:
            vals = answers_by_question.get(q.id, [])
            stat = self._compute_question_stat(q, vals)
            question_stats.append(stat)

        return AnalyticsResponse(
            form_id=form.id,
            total_responses=total_responses,
            questions=question_stats,
        )

    def _compute_question_stat(self, question: Question, values: list[Any]) -> AnalyticsQuestion:
        response_count = len(values)
        q_type = question.type
        settings = question.settings or {}

        if q_type in ("short_text", "long_text", "email"):
            return AnalyticsQuestion(
                question_id=question.id,
                question_title=question.title,
                question_type=q_type,
                response_count=response_count,
            )

        if q_type == "number":
            nums = [v for v in values if isinstance(v, (int, float)) and not isinstance(v, bool)]
            avg = round(float(sum(nums)) / len(nums), 2) if nums else None
            min_val = min(nums) if nums else None
            max_val = max(nums) if nums else None
            return AnalyticsQuestion(
                question_id=question.id,
                question_title=question.title,
                question_type=q_type,
                response_count=response_count,
                average=avg,
                minimum=min_val,
                maximum=max_val,
            )

        if q_type == "rating":
            ratings = [v for v in values if isinstance(v, int) and not isinstance(v, bool)]
            avg = round(float(sum(ratings)) / len(ratings), 2) if ratings else None
            min_r = settings.get("min_rating", settings.get("min", 1))
            max_r = settings.get("max_rating", settings.get("max", 5))
            distribution: dict[str, int] = {str(r): 0 for r in range(min_r, max_r + 1)}
            for r in ratings:
                key = str(r)
                distribution[key] = distribution.get(key, 0) + 1

            return AnalyticsQuestion(
                question_id=question.id,
                question_title=question.title,
                question_type=q_type,
                response_count=response_count,
                average=avg,
                distribution=distribution,
            )

        if q_type == "yes_no":
            distribution = {"true": 0, "false": 0}
            for v in values:
                if v is True:
                    distribution["true"] += 1
                elif v is False:
                    distribution["false"] += 1

            return AnalyticsQuestion(
                question_id=question.id,
                question_title=question.title,
                question_type=q_type,
                response_count=response_count,
                distribution=distribution,
            )

        if q_type in ("multiple_choice", "dropdown"):
            options = settings.get("options", [])
            distribution = {str(opt): 0 for opt in options}
            for v in values:
                key = str(v)
                distribution[key] = distribution.get(key, 0) + 1

            return AnalyticsQuestion(
                question_id=question.id,
                question_title=question.title,
                question_type=q_type,
                response_count=response_count,
                distribution=distribution,
            )

        return AnalyticsQuestion(
            question_id=question.id,
            question_title=question.title,
            question_type=q_type,
            response_count=response_count,
        )
