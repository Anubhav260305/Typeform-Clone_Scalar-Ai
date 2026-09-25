from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.form import Form
from app.models.response import Response


class FormRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, form: Form) -> Form:
        self.db.add(form)
        self.db.flush()
        form.response_count = 0
        return form

    def get_by_id(self, form_id: int) -> Form | None:
        statement = (
            select(Form, func.count(Response.id).label("response_count"))
            .outerjoin(Response, Form.id == Response.form_id)
            .where(Form.id == form_id)
            .group_by(Form.id)
        )
        row = self.db.execute(statement).first()
        if row is None:
            return None
        form, count = row
        form.response_count = count
        return form

    def get_by_slug(self, slug: str) -> Form | None:
        statement = select(Form).where(Form.slug == slug)
        return self.db.scalar(statement)

    def get_by_slug_with_questions(self, slug: str) -> Form | None:
        statement = (
            select(Form)
            .where(Form.slug == slug)
            .options(selectinload(Form.questions))
        )
        return self.db.scalar(statement)

    def get_all(self) -> list[Form]:
        statement = (
            select(Form, func.count(Response.id).label("response_count"))
            .outerjoin(Response, Form.id == Response.form_id)
            .group_by(Form.id)
            .order_by(Form.created_at.desc())
        )
        rows = self.db.execute(statement).all()
        forms: list[Form] = []
        for form, count in rows:
            form.response_count = count
            forms.append(form)
        return forms

    def get_response_count(self, form_id: int) -> int:
        statement = select(func.count(Response.id)).where(Response.form_id == form_id)
        return self.db.scalar(statement) or 0

    def slug_exists(self, slug: str) -> bool:
        return self.get_by_slug(slug) is not None

    def update(self, form: Form) -> Form:
        self.db.flush()
        if not hasattr(form, "response_count"):
            form.response_count = self.get_response_count(form.id)
        return form

    def delete(self, form: Form) -> None:
        self.db.delete(form)
        self.db.flush()
