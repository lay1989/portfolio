import os
from datetime import timedelta
from typing import ClassVar


class Config:
    ENVIRONMENT = os.getenv("PORTFOLIO_ENV", "development")
    SITE_URL = os.getenv("SITE_URL", "https://layshahdev.com").rstrip("/")
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS: ClassVar[dict[str, bool]] = {"hide_parameters": True}
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024
    MAX_FORM_MEMORY_SIZE = MAX_CONTENT_LENGTH
    MEDIA_MAX_BYTES = 8 * 1024 * 1024
    MEDIA_MAX_PIXELS = 20_000_000
    MEDIA_MAX_EDGE = 6000
    MEDIA_MAX_INPUT_EDGE = 16000
    MEDIA_MASTER_QUALITY = 92
    MEDIA_VARIANT_WIDTHS = (480, 960, 1600)
    MEDIA_QUALITY = 84
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    WTF_CSRF_TIME_LIMIT = 7200
    SESSION_COOKIE_NAME = "portfolio_owner"
    SESSION_COOKIE_SECURE = ENVIRONMENT == "production"
    TRUSTED_HOSTS = tuple(
        s.strip() for s in os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1").split(",")
    )
    LOCAL_OWNER_SETUP = ENVIRONMENT == "development"
    TEMPLATES_AUTO_RELOAD = True
    INQUIRY_EMAIL_ENABLED = (
        os.getenv("INQUIRY_EMAIL_ENABLED", "false").lower() == "true"
    )
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = os.getenv("SMTP_PORT", "587")
    SMTP_SECURITY = os.getenv("SMTP_SECURITY", "starttls")
    SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    INQUIRY_EMAIL_FROM = os.getenv("INQUIRY_EMAIL_FROM", "")
    INQUIRY_EMAIL_TO = os.getenv("INQUIRY_EMAIL_TO", "")
    CONTACT_IP_LIMIT = 5
    CONTACT_GLOBAL_LIMIT = 100
    TRUST_LOCAL_PROXY = os.getenv("TRUST_LOCAL_PROXY", "false").lower() == "true"
    SEARCH_INDEXING_ENABLED = (
        os.getenv("SEARCH_INDEXING_ENABLED", "true").lower() == "true"
    )
