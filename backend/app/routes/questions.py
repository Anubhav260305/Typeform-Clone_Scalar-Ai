from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.question import (
    QuestionCreate,
    QuestionRead,
    QuestionReorder,
    QuestionUpdate,
)
from app.services.question_service import QuestionService

router = APIRouter()


def get_question_service(db: Session = Depends(get_db)) -> QuestionService:
    return QuestionService(db)


@router.post(
    "/forms/{form_id}/questions",
    response_model=QuestionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_question(
    form_id: int,
    payload: QuestionCreate,
    service: QuestionService = Depends(get_question_service),
) -> QuestionRead:
    return service.create_question(form_id, payload)


@router.get("/forms/{form_id}/questions", response_model=list[QuestionRead])
def list_questions(
    form_id: int,
    service: QuestionService = Depends(get_question_service),
) -> list[QuestionRead]:
    return service.get_questions_by_form(form_id)


@router.put("/forms/{form_id}/questions/reorder", response_model=list[QuestionRead])
def reorder_questions(
    form_id: int,
    payload: QuestionReorder,
    service: QuestionService = Depends(get_question_service),
) -> list[QuestionRead]:
    return service.reorder_questions(form_id, payload)


@router.get("/questions/{question_id}", response_model=QuestionRead)
def get_question(
    question_id: int,
    service: QuestionService = Depends(get_question_service),
) -> QuestionRead:
    return service.get_question(question_id)


@router.patch("/questions/{question_id}", response_model=QuestionRead)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    service: QuestionService = Depends(get_question_service),
) -> QuestionRead:
    return service.update_question(question_id, payload)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int,
    service: QuestionService = Depends(get_question_service),
) -> None:
    service.delete_question(question_id)
