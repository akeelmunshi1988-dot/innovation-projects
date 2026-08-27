from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: Optional[str] = None  # used by the "inspire from a room photo" rug-matcher only (app/services/vision_matcher.py) — NOT the vendor AI assistant, see OPENAI_API_KEY
    OPENAI_API_KEY: Optional[str] = None  # required for the vendor AI Assistant page (app/services/ai_agent.py); also enables the visualizer's "AI-enhanced lighting" polish pass
    DATABASE_URL: str = "sqlite:///./rug_manufacture.db"
    APP_NAME: str = "DreamRugsCreation"
    DEBUG: bool = False

    JWT_SECRET: str = "loomcraft-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30  # short-lived access token — refreshed via the refresh_token cookie
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    COOKIE_SECURE: bool = True  # set False in .env for local http:// dev if needed

    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "DreamRugsCreation"

    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"  # used to build OAuth redirect_uri values registered with each provider

    # Gates the whole site (via nginx auth_request, see DEPLOYMENT.md) to
    # visitors browsing from India unless they hold this key. Unset/empty
    # disables the gate entirely — safe default, nothing is blocked unless
    # this is explicitly configured.
    INDIA_ACCESS_KEY: Optional[str] = None

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
