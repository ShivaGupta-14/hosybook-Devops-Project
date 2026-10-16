from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "HosyBook API"
    database_url: str = "postgresql+psycopg://hosybook:hosybook@localhost:5432/hosybook"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
