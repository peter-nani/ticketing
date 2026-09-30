from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.middlewares.correlation_id import CorrelationIdMiddleware
from app.middlewares.error_handler import setup_exception_handlers
from app.api.v1.router import api_router
from app.models import user, ticket, comment, attachment
import structlog

setup_logging()
logger = structlog.get_logger()

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
    )

    # Set all CORS enabled origins
    if settings.ALLOWED_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.ALLOWED_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Add custom middlewares
    app.add_middleware(CorrelationIdMiddleware)

    # Setup exception handlers
    setup_exception_handlers(app)

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/healthz", status_code=status.HTTP_200_OK, tags=["Health"])
    async def health_check():
        return {"status": "healthy", "env": settings.APP_ENV}

    @app.get("/ready", status_code=status.HTTP_200_OK, tags=["Health"])
    async def readiness_check():
        # Add database connectivity check here if needed
        return {"status": "ready"}

    return app

app = create_app()
