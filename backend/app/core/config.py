"""Application settings.

Every value has a development default so the app runs on a fresh machine, but
production must set ``JWT_SECRET`` and ``DATABASE_URL`` explicitly.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "RainWise"
    environment: str = "development"
    debug: bool = True

    # SQLite is the zero-setup local default. Production uses PostgreSQL.
    database_url: str = "sqlite:///./rainwise.db"
    auto_create_tables: bool = True

    jwt_secret: str = "dev-only-secret-change-before-deploying"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    reset_token_minutes: int = 30

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    login_attempts_per_minute: int = 10
    register_attempts_per_hour: int = 5

    # Optional. Without a key the concept endpoint reports that it is disabled.
    gemini_api_key: str = ""
    gemini_image_model: str = "gemini-3.1-flash-image"
    gemini_timeout_seconds: int = 90

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
