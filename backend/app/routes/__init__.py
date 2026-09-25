from app.routes.analytics import router as analytics_router
from app.routes.forms import router as forms_router
from app.routes.public_forms import router as public_forms_router
from app.routes.questions import router as questions_router
from app.routes.responses import router as responses_router

__all__ = [
    "analytics_router",
    "forms_router",
    "public_forms_router",
    "questions_router",
    "responses_router",
]
