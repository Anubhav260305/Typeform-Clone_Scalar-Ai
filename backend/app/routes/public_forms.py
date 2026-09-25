from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.form import PublicFormRead
from app.services.form_service import FormService

router = APIRouter()


def get_form_service(db: Session = Depends(get_db)) -> FormService:
    return FormService(db)


@router.get("/forms/{slug}", response_model=PublicFormRead)
def get_public_form(
    slug: str,
    service: FormService = Depends(get_form_service),
) -> PublicFormRead:
    return service.get_public_form(slug)
