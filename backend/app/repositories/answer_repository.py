from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.answer import Answer


class AnswerRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, answer: Answer) -> Answer:
        self.db.add(answer)
        self.db.flush()
        return answer

    def create_many(self, answers: list[Answer]) -> list[Answer]:
        self.db.add_all(answers)
        self.db.flush()
        return answers

    def get_by_response(self, response_id: int) -> list[Answer]:
        statement = select(Answer).where(Answer.response_id == response_id)
        return list(self.db.scalars(statement).all())

    def get_by_question(self, question_id: int) -> list[Answer]:
        statement = select(Answer).where(Answer.question_id == question_id)
        return list(self.db.scalars(statement).all())

    def delete(self, answer: Answer) -> None:
        self.db.delete(answer)
        self.db.flush()

    def delete_by_response(self, response_id: int) -> None:
        statement = delete(Answer).where(Answer.response_id == response_id)
        self.db.execute(statement)
        self.db.flush()
