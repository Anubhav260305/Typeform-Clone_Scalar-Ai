import re
import unicodedata

from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.models.form import Form
from app.repositories.form_repository import FormRepository
from app.repositories.question_repository import QuestionRepository
from app.schemas.form import FormCreate, FormUpdate, PublicFormRead, PublicQuestionRead
from app.services.question_service import validate_question_settings


class FormService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = FormRepository(db)
        self.question_repository = QuestionRepository(db)

    def create_form(self, payload: FormCreate) -> Form:
        slug = self._unique_slug(payload.title)
        form = Form(title=payload.title.strip(), slug=slug, status="draft")
        self.repository.create(form)
        self.db.commit()
        self.db.refresh(form)
        form.response_count = 0
        return form

    def list_forms(self) -> list[Form]:
        return self.repository.get_all()

    def get_form(self, form_id: int) -> Form:
        form = self.repository.get_by_id(form_id)
        if form is None:
            raise NotFoundError(f"Form {form_id} not found")
        return form

    def update_form(self, form_id: int, payload: FormUpdate) -> Form:
        form = self.get_form(form_id)
        if payload.title is not None:
            form.title = payload.title.strip()
        if payload.status is not None:
            form.status = payload.status
        self.repository.update(form)
        self.db.commit()
        self.db.refresh(form)
        form.response_count = self.repository.get_response_count(form.id)
        return form

    def delete_form(self, form_id: int) -> None:
        form = self.get_form(form_id)
        self.repository.delete(form)
        self.db.commit()

    def publish_form(self, form_id: int) -> Form:
        form = self.get_form(form_id)

        # Idempotent: if already published, return immediately
        if form.status == "published":
            return form

        questions = self.question_repository.get_by_form(form_id)
        if not questions:
            raise AppException("Cannot publish a form without any questions", status_code=400)

        for q in questions:
            if not q.title or not q.title.strip():
                raise AppException(f"Question {q.id} has an empty title", status_code=400)
            validate_question_settings(q.type, q.settings)

        form.status = "published"
        self.repository.update(form)
        self.db.commit()
        self.db.refresh(form)
        form.response_count = self.repository.get_response_count(form.id)
        return form

    def unpublish_form(self, form_id: int) -> Form:
        form = self.get_form(form_id)

        # Idempotent: if already draft, return immediately
        if form.status == "draft":
            return form

        form.status = "draft"
        self.repository.update(form)
        self.db.commit()
        self.db.refresh(form)
        form.response_count = self.repository.get_response_count(form.id)
        return form

    def get_public_form(self, slug: str) -> PublicFormRead:
        form = self.repository.get_by_slug_with_questions(slug)
        if form is None or form.status != "published":
            raise NotFoundError(f"Form with slug '{slug}' not found")

        sorted_questions = sorted(form.questions, key=lambda q: (q.order_index, q.id))
        questions_data = [
            PublicQuestionRead(
                id=q.id,
                type=q.type,
                title=q.title,
                description=q.description,
                required=q.required,
                order_index=q.order_index,
                settings=q.settings,
            )
            for q in sorted_questions
        ]

        return PublicFormRead(
            id=form.id,
            title=form.title,
            slug=form.slug,
            questions=questions_data,
        )

    def _unique_slug(self, title: str) -> str:
        base = slugify(title)
        slug = base
        suffix = 2
        while self.repository.slug_exists(slug):
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug


def slugify(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return slug or "form"
