from functools import lru_cache
from typing import Optional, List
from pathlib import Path
from pydantic import BaseSettings, AnyUrl

class Settings(BaseSettings):
    database_url: AnyUrl
    jwt_secret: str
    jwt_alg: str = "HS256"
    jwt_expire_min: int = 30
    app_base_url: str = "http://localhost:8000"

    # CORS Configuration
    cors_origins: str = "http://localhost,http://localhost:80,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173"

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_fallback_to_console: bool = False
    verification_expire_min: int = 30

    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: Optional[str] = None

    # MoMo payment gateway
    momo_partner_code: Optional[str] = None
    momo_access_key: Optional[str] = None
    momo_secret_key: Optional[str] = None
    momo_endpoint: str = "https://test-payment.momo.vn/v2/gateway/api/create"
    momo_redirect_url: Optional[str] = None
    momo_ipn_url: Optional[str] = None
    momo_request_type: str = "captureWallet"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string to list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = str(Path(__file__).resolve().parent.parent / ".env")
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    # Let Pydantic BaseSettings load values from environment and .env file
    return Settings()
