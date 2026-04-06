import json
from typing import Any, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vambe"
    frontend_url: str = "http://localhost:5173"
    csv_path: str = "vambe_clients.csv"
    allowed_origins: list[str] = ["http://localhost:5173"]
    process_api_key: Optional[str] = None

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [o.strip() for o in v.split(",") if o.strip()]
        return v

    class Config:
        env_file = ".env"


settings = Settings()
