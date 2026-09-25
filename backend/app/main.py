from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.exceptions import AppException
from app.database.connection import init_db
from app.routes.analytics import router as analytics_router
from app.routes.forms import router as forms_router
from app.routes.public_forms import router as public_forms_router
from app.routes.questions import router as questions_router
from app.routes.responses import router as responses_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def handle_app_exception(_request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(forms_router, prefix="/api/forms", tags=["forms"])
app.include_router(public_forms_router, prefix="/api/public", tags=["public"])
app.include_router(questions_router, prefix="/api", tags=["questions"])
app.include_router(responses_router, prefix="/api", tags=["responses"])
app.include_router(analytics_router, prefix="/api", tags=["analytics"])
