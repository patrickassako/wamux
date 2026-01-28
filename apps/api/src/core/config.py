"""
Core configuration module using Pydantic Settings.
Loads environment variables with validation.
"""
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    
    model_config = SettingsConfigDict(
        env_file="../../.env",  # Path relative to where commands are run (apps/api)
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
        extra="ignore"  # Ignore extras like ENGINE_ vars
    )
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    api_env: str = Field(default="development", alias="API_ENV")
    debug: bool = Field(default=True, alias="DEBUG")
    
    project_name: str = "WhatsApp API Gateway"
    version: str = "0.1.0"
    
    # Supabase
    supabase_url: str = Field(alias="SUPABASE_URL")
    supabase_key: str = Field(alias="SUPABASE_KEY")
    supabase_service_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_KEY")
    
    # JWT
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration: int = Field(default=3600)  # 1 hour in seconds
    
    # Redis
    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_password: str = Field(default="", alias="REDIS_PASSWORD")
    redis_db: int = Field(default=0, alias="REDIS_DB")
    
    # Authentication
    # JWT settings combined above
    
    # CORS
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        alias="CORS_ORIGINS",
    )
    
    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins_raw.split(",")]
    
    # Flutterwave Payment Configuration
    flutterwave_public_key: str = Field(default="", validation_alias="FLUTTERWAVE_PUBLIC_KEY")
    flutterwave_secret_key: str = Field(default="", validation_alias="FLUTTERWAVE_SECRET_KEY")
    flutterwave_webhook_secret: str = Field(default="", validation_alias="FLUTTERWAVE_WEBHOOK_SECRET")
    flutterwave_encryption_key: str = Field(default="", validation_alias="FLUTTERWAVE_ENCRYPTION_KEY")
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")
    rate_limit_burst: int = Field(default=10, alias="RATE_LIMIT_BURST")
    
    @property
    def redis_url(self) -> str:
        """
        Construct Redis connection URL.
        
        Returns:
            str: Redis connection URL
        """
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


# Global settings instance
settings = Settings()
