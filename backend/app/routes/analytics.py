from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/forms/{form_id}/analytics", response_model=AnalyticsResponse)
def get_form_analytics(
    form_id: int,
    service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsResponse:
    return service.get_form_analytics(form_id)
