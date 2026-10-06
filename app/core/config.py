from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_USER_EMAIL_DOMAIN: str
    
    APP_NAME: str = "FastAPI Ticketing Service"
    APP_BRAND_NAME: str
    APP_ENV: str = "development"
    DEBUG: bool = False

    # SERVER HOST & PORT
    HOST: str = "192.168.2.245"
    PORT: int = 8000
    WORKERS_COUNT: int = 4
    TICKET_IMAGE_STORAGE_PATH: str = "./storage/images"
    COMMENT_IMAGE_MAX_BYTES: int = 8 * 1024 * 1024

    # DATABASE
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: Optional[str] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info) -> str:
        if isinstance(v, str):
            return v
        return f"postgresql+asyncpg://{info.data.get('POSTGRES_USER')}:{info.data.get('POSTGRES_PASSWORD')}@{info.data.get('POSTGRES_SERVER')}:{info.data.get('POSTGRES_PORT')}/{info.data.get('POSTGRES_DB')}"

    # REDIS
    REDIS_URL: str = "redis://localhost:6379/0"
    RATE_LIMIT_PER_MINUTE: int = 60

    # CORS
    ALLOWED_ORIGINS: Union[str, List[str]] = []

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str], None]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # LOGGING
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")


settings = Settings()


def is_allowed_user_email(email: str) -> bool:
    allowed_domain = settings.ALLOWED_USER_EMAIL_DOMAIN.strip().lower().lstrip("@")
    return bool(allowed_domain) and allowed_domain != "*" and email.strip().rsplit("@", 1)[-1].lower() == allowed_domain
