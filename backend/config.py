import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server Configuration
    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = True
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("OPENAI_API_KEY")
    openai_model: str = "gpt-3.5-turbo"
    openai_temperature: float = 0.1
    openai_max_tokens: int = 500
    
    # PDF Configuration
    pdf_path: str = ""  # No default PDF - users will upload their own
    max_file_size_mb: int = 30  # Maximum PDF file size in MB
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # Context Provider Configuration
    top_k_chunks: int = 3
    similarity_threshold: float = 0.1
    embedding_model: str = "text-embedding-ada-002"
    embedding_batch_size: int = 100
    
    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings() 