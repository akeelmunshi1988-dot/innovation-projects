from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: Optional[str] = None
    DATABASE_URL: str = "sqlite:///./rug_manufacture.db"
    APP_NAME: str = "LoomCraft AI"
    DEBUG: bool = False

    JWT_SECRET: str = "loomcraft-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "LoomCraft AI"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
