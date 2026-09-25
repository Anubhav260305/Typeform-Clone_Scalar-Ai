from typing import Any

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.models.question import Question
from app.repositories.form_repository import FormRepository
from app.repositories.question_repository import QuestionRepository
from app.schemas.question import (
    SUPPORTED_QUESTION_TYPES,
    QuestionCreate,
    QuestionReorder,
    QuestionUpdate,
)


def validate_question_settings(q_type: str, settings: dict[str, Any] | None) -> dict[str, Any]:
    if q_type not in SUPPORTED_QUESTION_TYPES:
        raise AppException(
            f"Unsupported question type: '{q_type}'. Supported types: {', '.join(SUPPORTED_QUESTION_TYPES)}",
            status_code=400,
        )

    clean_settings = dict(settings) if settings else {}

    if q_type in ("multiple_choice", "dropdown"):
        options = clean_settings.get("options")
        if not options or not isinstance(options, list):
            raise AppException(
                f"Question type '{q_type}' requires a non-empty list of 'options' in settings",
                status_code=400,
            )
        clean_opts: list[str] = []
        for opt in options:
            if not isinstance(opt, str) or not opt.strip():
                raise AppException(
                    f"Each option for '{q_type}' must be a non-empty string",
                    status_code=400,
                )
            clean_opts.append(opt.strip())
        clean_settings["options"] = clean_opts

    elif q_type == "rating":
        min_val = clean_settings.get("min_rating", clean_settings.get("min", 1))
        max_val = clean_settings.get("max_rating", clean_settings.get("max", 5))
        if not isinstance(min_val, int) or not isinstance(max_val, int):
            raise AppException("Rating settings 'min' and 'max' must be integers", status_code=400)
        if min_val < 0 or max_val <= min_val or max_val > 10:
            raise AppException(
                f"Rating scale invalid: min ({min_val}) must be >= 0 and less than max ({max_val}), max <= 10",
                status_code=400,
            )
        clean_settings["min_rating"] = min_val
        clean_settings["max_rating"] = max_val

    elif q_type == "number":
        if "min" in clean_settings and not isinstance(clean_settings["min"], (int, float)):
            raise AppException("Number setting 'min' must be numeric", status_code=400)
        if "max" in clean_settings and not isinstance(clean_settings["max"], (int, float)):
            raise AppException("Number setting 'max' must be numeric", status_code=400)
        if (
            "min" in clean_settings
            and "max" in clean_settings
            and clean_settings["min"] > clean_settings["max"]
        ):
            raise AppException("Number setting 'min' cannot be greater than 'max'", status_code=400)

    return clean_settings


class QuestionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.form_repository = FormRepository(db)
        self.question_repository = QuestionRepository(db)

    def create_question(self, form_id: int, payload: QuestionCreate) -> Question:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")

        clean_settings = validate_question_settings(payload.type, payload.settings)

        if payload.order_index is None:
            max_order = self.question_repository.get_max_order_index(form_id)
            order_index = 0 if max_order is None else max_order + 1
        else:
            order_index = payload.order_index

        question = Question(
            form_id=form_id,
            type=payload.type,
            title=payload.title,
            description=payload.description.strip() if payload.description else None,
            required=payload.required,
            order_index=order_index,
            settings=clean_settings,
        )
        self.question_repository.create(question)
        self.db.commit()
        self.db.refresh(question)
        return question

    def get_questions_by_form(self, form_id: int) -> list[Question]:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")
        return self.question_repository.get_by_form(form_id)

    def get_question(self, question_id: int) -> Question:
        question = self.question_repository.get_by_id(question_id)
        if question is None:
            raise NotFoundError(f"Question {question_id} not found")
        return question

    def update_question(self, question_id: int, payload: QuestionUpdate) -> Question:
        question = self.get_question(question_id)

        target_type = payload.type if payload.type is not None else question.type
        target_settings = payload.settings if payload.settings is not None else question.settings

        if payload.type is not None or payload.settings is not None:
            clean_settings = validate_question_settings(target_type, target_settings)
            question.type = target_type
            question.settings = clean_settings

        if payload.title is not None:
            question.title = payload.title
        if payload.description is not None:
            question.description = payload.description.strip() if payload.description else None
        if payload.required is not None:
            question.required = payload.required
        if payload.order_index is not None:
            question.order_index = payload.order_index

        self.question_repository.update(question)
        self.db.commit()
        self.db.refresh(question)
        return question

    def delete_question(self, question_id: int) -> None:
        question = self.get_question(question_id)
        self.question_repository.delete(question)
        self.db.commit()

    def reorder_questions(self, form_id: int, payload: QuestionReorder) -> list[Question]:
        form = self.form_repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")

        existing_questions = self.question_repository.get_by_form(form_id)
        existing_ids = {q.id for q in existing_questions}

        if len(payload.question_ids) != len(set(payload.question_ids)):
            raise AppException("question_ids must contain unique question IDs", status_code=400)

        if set(payload.question_ids) != existing_ids:
            raise AppException(
                f"question_ids must match all question IDs belonging to form {form_id}",
                status_code=400,
            )

        reordered = self.question_repository.reorder(form_id, payload.question_ids)
        self.db.commit()
        for q in reordered:
            self.db.refresh(q)
        return reordered
