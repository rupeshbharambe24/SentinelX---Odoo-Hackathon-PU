from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # PostgreSQL is the only supported database. The default points at the
    # docker-compose container so `uvicorn app.main:app` works after `docker-compose up -d`
    # even without a populated .env file.
    DATABASE_URL: str = "postgresql://traveloop:traveloop@localhost:5432/traveloop"

    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    FRONTEND_URL: str = "http://localhost:5173"

    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    UNSPLASH_ACCESS_KEY: str = ""
    OPENTRIPMAP_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
