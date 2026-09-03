from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

# Absolute path so settings load correctly regardless of the process's cwd —
# env_file was previously the relative string ".env", which silently resolved
# against whatever directory the app happened to be launched from (e.g. repo
# root instead of backend/) and fell back to every field's default un-warned,
# including DATABASE_URL's sqlite fallback.
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: Optional[str] = None  # used by the "inspire from a room photo" rug-matcher only (app/services/vision_matcher.py) — NOT the vendor AI assistant, see OPENAI_API_KEY
    OPENAI_API_KEY: Optional[str] = None  # required for the vendor AI Assistant page (app/services/ai_agent.py); also enables the visualizer's "AI-enhanced lighting" polish pass
    CATALOG_API_KEY: Optional[str] = None  # local room-visualizer agent credential for the authenticated public catalog API
    MCP_CONNECTOR_TOKEN: Optional[str] = None  # optional dedicated bearer token; falls back to CATALOG_API_KEY
    MCP_TENANT_ID: Optional[int] = 1  # connector is deliberately scoped to one tenant
    MCP_OAUTH_ACCESS_TOKEN_MINUTES: int = 60
    MCP_OAUTH_REFRESH_TOKEN_DAYS: int = 30
    MCP_UPLOAD_TMP_DIR: str = "/tmp/dreamrugs-mcp-uploads"
    DATABASE_URL: str = "sqlite:///./rug_manufacture.db"
    SQLITE_SOURCE_URL: Optional[str] = None  # one-time legacy import source; unused by the running application
    APP_NAME: str = "DreamRugsCreation"

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
    # visitors browsing from India unless they hold one of these keys.
    # Comma-separated — issue one personal token per person who needs access
    # from India (e.g. "token-for-akeel,token-for-colleague") rather than
    # sharing a single secret. Unset/empty disables the gate entirely — safe
    # default, nothing is blocked unless this is explicitly configured.
    INDIA_ACCESS_KEYS: Optional[str] = None

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None

    class Config:
        env_file = str(_ENV_FILE)
        case_sensitive = True


settings = Settings()
