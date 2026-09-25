from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.answer import Answer
from app.models.response import Response


class ResponseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, response: Response) -> Response:
        self.db.add(response)
        self.db.flush()
        return response

    def get_by_id(self, response_id: int) -> Response | None:
        return self.db.get(Response, response_id)

    def get_by_form(self, form_id: int) -> list[Response]:
        statement = (
            select(Response)
            .where(Response.form_id == form_id)
            .order_by(Response.submitted_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_with_answers(self, response_id: int) -> Response | None:
        statement = (
            select(Response)
            .where(Response.id == response_id)
            .options(selectinload(Response.answers).joinedload(Answer.question))
        )
        return self.db.scalar(statement)

    def count_by_form(self, form_id: int) -> int:
        statement = select(func.count()).select_from(Response).where(Response.form_id == form_id)
        return self.db.scalar(statement) or 0

    def delete(self, response: Response) -> None:
        self.db.delete(response)
        self.db.flush()
