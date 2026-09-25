from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.form import FormCreate, FormRead, FormUpdate
from app.services.form_service import FormService

router = APIRouter()


def get_form_service(db: Session = Depends(get_db)) -> FormService:
    return FormService(db)


@router.post("", response_model=FormRead, status_code=status.HTTP_201_CREATED)
def create_form(
    payload: FormCreate,
    service: FormService = Depends(get_form_service),
) -> FormRead:
    return service.create_form(payload)


@router.get("", response_model=list[FormRead])
def list_forms(service: FormService = Depends(get_form_service)) -> list[FormRead]:
    return service.list_forms()


@router.get("/{form_id}", response_model=FormRead)
def get_form(form_id: int, service: FormService = Depends(get_form_service)) -> FormRead:
    return service.get_form(form_id)


@router.patch("/{form_id}", response_model=FormRead)
def update_form(
    form_id: int,
    payload: FormUpdate,
    service: FormService = Depends(get_form_service),
) -> FormRead:
    return service.update_form(form_id, payload)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, service: FormService = Depends(get_form_service)) -> None:
    service.delete_form(form_id)


@router.post("/{form_id}/publish", response_model=FormRead)
def publish_form(
    form_id: int,
    service: FormService = Depends(get_form_service),
) -> FormRead:
    return service.publish_form(form_id)


@router.post("/{form_id}/unpublish", response_model=FormRead)
def unpublish_form(
    form_id: int,
    service: FormService = Depends(get_form_service),
) -> FormRead:
    return service.unpublish_form(form_id)


@router.post(
    "/{form_id}/duplicate",
    response_model=FormRead,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_form(
    form_id: int,
    service: FormService = Depends(get_form_service),
) -> FormRead:
    return service.duplicate_form(form_id)

