import re
from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.models.answer import Answer
from app.models.question import Question, utc_now
from app.models.response import Response
from app.repositories.answer_repository import AnswerRepository
from app.repositories.form_repository import FormRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.response_repository import ResponseRepository
from app.schemas.response import (
    AnswerDetail,
    ResponseDetail,
    ResponseRead,
    ResponseSubmit,
)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_answer_value(question: Question, value: Any) -> None:
    if value is None:
        if question.required:
            raise AppException(
                f"Answer for required question '{question.title}' cannot be empty",
                status_code=400,
            )
        return

    q_type = question.type
    settings = question.settings or {}

    if q_type in ("short_text", "long_text"):
        if not isinstance(value, str):
            raise AppException(
                f"Answer for question '{question.title}' must be a string",
                status_code=400,
            )
        if question.required and not value.strip():
            raise AppException(
                f"Answer for required question '{question.title}' cannot be empty",
                status_code=400,
            )

    elif q_type == "email":
        if not isinstance(value, str):
            raise AppException(
                f"Answer for question '{question.title}' must be an email string",
                status_code=400,
            )
        clean_email = value.strip()
        if not EMAIL_REGEX.match(clean_email):
            raise AppException(
                f"Answer '{value}' for question '{question.title}' is not a valid email address",
                status_code=400,
            )

    elif q_type == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise AppException(
                f"Answer for question '{question.title}' must be a numeric value",
                status_code=400,
            )
        min_val = settings.get("min")
        max_val = settings.get("max")
        if min_val is not None and value < min_val:
            raise AppException(
                f"Answer for question '{question.title}' must be at least {min_val}",
                status_code=400,
            )
        if max_val is not None and value > max_val:
            raise AppException(
                f"Answer for question '{question.title}' cannot exceed {max_val}",
                status_code=400,
            )

    elif q_type == "yes_no":
        if not isinstance(value, bool):
            raise AppException(
                f"Answer for question '{question.title}' must be a boolean (true or false)",
                status_code=400,
            )

    elif q_type == "rating":
        if isinstance(value, bool) or not isinstance(value, int):
            raise AppException(
                f"Answer for question '{question.title}' must be an integer rating",
                status_code=400,
            )
        min_r = settings.get("min_rating", settings.get("min", 1))
        max_r = settings.get("max_rating", settings.get("max", 5))
        if value < min_r or value > max_r:
            raise AppException(
                f"Answer for question '{question.title}' must be between {min_r} and {max_r}",
                status_code=400,
            )

    elif q_type == "multiple_choice":
        options = settings.get("options", [])
        if value not in options:
            raise AppException(
                f"Answer '{value}' for question '{question.title}' is not a valid option. Allowed: {options}",
                status_code=400,
            )

    elif q_type == "dropdown":
        options = settings.get("options", [])
        if value not in options:
            raise AppException(
                f"Answer '{value}' for question '{question.title}' is not a valid dropdown option. Allowed: {options}",
                status_code=400,
            )


class ResponseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.form_repository = FormRepository(db)
        self.question_repository = QuestionRepository(db)
        self.response_repository = ResponseRepository(db)
        self.answer_repository = AnswerRepository(db)

    def submit_response(self, form_id: int, payload: ResponseSubmit) -> ResponseDetail:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")

        if form.status != "published":
            raise AppException(
                "Form is not published and cannot accept responses",
                status_code=400,
            )

        questions = self.question_repository.get_by_form(form_id)
        questions_map = {q.id: q for q in questions}

        # Validate duplicate question IDs in payload
        submitted_q_ids = [a.question_id for a in payload.answers]
        if len(submitted_q_ids) != len(set(submitted_q_ids)):
            raise AppException(
                "Duplicate answers for the same question are not allowed",
                status_code=400,
            )

        # Validate that every submitted question belongs to this form
        for a in payload.answers:
            if a.question_id not in questions_map:
                raise AppException(
                    f"Question {a.question_id} does not belong to form {form_id}",
                    status_code=400,
                )

        # Validate required questions
        answers_by_qid = {a.question_id: a.value for a in payload.answers}
        for q in questions:
            if q.required:
                if q.id not in answers_by_qid:
                    raise AppException(
                        f"Question '{q.title}' (ID {q.id}) is required",
                        status_code=400,
                    )
                val = answers_by_qid[q.id]
                if val is None or (isinstance(val, str) and not val.strip()):
                    raise AppException(
                        f"Answer for required question '{q.title}' cannot be empty",
                        status_code=400,
                    )

        # Validate answer values according to question type and settings
        for a in payload.answers:
            q = questions_map[a.question_id]
            validate_answer_value(q, a.value)

        # Atomic persistence of Response and Answers
        response = Response(form_id=form_id, submitted_at=utc_now())
        self.response_repository.create(response)

        answers_to_create = [
            Answer(
                response_id=response.id,
                question_id=a.question_id,
                value=a.value,
            )
            for a in payload.answers
        ]
        self.answer_repository.create_many(answers_to_create)
        self.db.commit()
        self.db.refresh(response)

        answer_details = [
            AnswerDetail(
                id=ans.id,
                question_id=ans.question_id,
                question_title=questions_map[ans.question_id].title,
                question_type=questions_map[ans.question_id].type,
                value=ans.value,
            )
            for ans in answers_to_create
        ]

        return ResponseDetail(
            id=response.id,
            form_id=response.form_id,
            submitted_at=response.submitted_at,
            created_at=response.created_at,
            answers=answer_details,
        )

    def list_responses(self, form_id: int) -> list[ResponseRead]:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")
        return self.response_repository.get_by_form(form_id)

    def get_response_detail(self, response_id: int) -> ResponseDetail:
        response = self.response_repository.get_with_answers(response_id)
        if response is None:
            raise NotFoundError(f"Response {response_id} not found")

        answer_details = [
            AnswerDetail(
                id=ans.id,
                question_id=ans.question_id,
                question_title=ans.question.title if ans.question else "Unknown Question",
                question_type=ans.question.type if ans.question else "unknown",
                value=ans.value,
            )
            for ans in response.answers
        ]

        return ResponseDetail(
            id=response.id,
            form_id=response.form_id,
            submitted_at=response.submitted_at,
            created_at=response.created_at,
            answers=answer_details,
        )

    def count_responses(self, form_id: int) -> int:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")
        return self.response_repository.count_by_form(form_id)

    def delete_response(self, response_id: int) -> None:
        response = self.response_repository.get_by_id(response_id)
        if response is None:
            raise NotFoundError(f"Response {response_id} not found")
        self.response_repository.delete(response)
        self.db.commit()
