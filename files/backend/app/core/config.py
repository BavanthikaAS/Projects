from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import field_validator
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./auctionhub.db"
    
    JWT_SECRET: str = "super_secret_jwt_key_auction_hub_safe_development_min_32_chars!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    SUPABASE_URL: str = "https://mock.supabase.co"
    SUPABASE_KEY: str = "mock-key"
    SUPABASE_SERVICE_KEY: str = "mock-service-key"
    SUPABASE_STORAGE_BUCKET: str = "product-images"
    
    AI_PROVIDER: str = "mock"
    AI_API_KEY: str = "mock-ai-key"
    AI_API_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    AI_TIMEOUT_SECONDS: int = 8
    
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000,http://127.0.0.1:5500"

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

