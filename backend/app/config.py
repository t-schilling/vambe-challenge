from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vambe"
    frontend_url: str = "http://localhost:5173"
    csv_path: str = "vambe_clients.csv"
    # Comma-separated string avoids pydantic-settings trying to JSON-parse a list field.
    # Use settings.origins property wherever a list is needed.
    allowed_origins: str = "http://localhost:5173"
    process_api_key: Optional[str] = None

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
