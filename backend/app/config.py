from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vambe"
    frontend_url: str = "http://localhost:5173"
    csv_path: str = "vambe_clients.csv"

    class Config:
        env_file = ".env"


settings = Settings()
