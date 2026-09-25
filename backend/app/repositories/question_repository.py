from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.question import Question


class QuestionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, question: Question) -> Question:
        self.db.add(question)
        self.db.flush()
        return question

    def get_by_id(self, question_id: int) -> Question | None:
        return self.db.get(Question, question_id)

    def get_by_form(self, form_id: int) -> list[Question]:
        statement = (
            select(Question)
            .where(Question.form_id == form_id)
            .order_by(Question.order_index.asc(), Question.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_max_order_index(self, form_id: int) -> int | None:
        statement = select(func.max(Question.order_index)).where(Question.form_id == form_id)
        return self.db.scalar(statement)

    def update(self, form: Question) -> Question:
        self.db.flush()
        return form

    def delete(self, question: Question) -> None:
        self.db.delete(question)
        self.db.flush()

    def reorder(self, form_id: int, question_ids: list[int]) -> list[Question]:
        questions = self.get_by_form(form_id)
        question_map = {q.id: q for q in questions}

        reordered: list[Question] = []
        for index, q_id in enumerate(question_ids):
            q = question_map[q_id]
            q.order_index = index
            reordered.append(q)

        self.db.flush()
        return reordered
