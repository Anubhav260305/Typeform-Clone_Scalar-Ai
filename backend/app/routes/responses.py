from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.response import (
    ResponseCount,
    ResponseDetail,
    ResponseRead,
    ResponseSubmit,
)
from app.services.response_service import ResponseService

router = APIRouter()


def get_response_service(db: Session = Depends(get_db)) -> ResponseService:
    return ResponseService(db)


@router.post(
    "/forms/{form_id}/responses",
    response_model=ResponseDetail,
    status_code=status.HTTP_201_CREATED,
)
def submit_response(
    form_id: int,
    payload: ResponseSubmit,
    service: ResponseService = Depends(get_response_service),
) -> ResponseDetail:
    return service.submit_response(form_id, payload)


@router.get("/forms/{form_id}/responses/count", response_model=ResponseCount)
def count_responses(
    form_id: int,
    service: ResponseService = Depends(get_response_service),
) -> ResponseCount:
    count = service.count_responses(form_id)
    return ResponseCount(count=count)


@router.get("/forms/{form_id}/responses", response_model=list[ResponseRead])
def list_responses(
    form_id: int,
    service: ResponseService = Depends(get_response_service),
) -> list[ResponseRead]:
    return service.list_responses(form_id)


@router.get("/responses/{response_id}", response_model=ResponseDetail)
def get_response(
    response_id: int,
    service: ResponseService = Depends(get_response_service),
) -> ResponseDetail:
    return service.get_response_detail(response_id)


@router.delete("/responses/{response_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_response(
    response_id: int,
    service: ResponseService = Depends(get_response_service),
) -> None:
    service.delete_response(response_id)
