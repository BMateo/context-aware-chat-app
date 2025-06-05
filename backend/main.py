from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
from contextlib import asynccontextmanager
from config import settings
from services.context_provider import ContextProvider
import os
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global context provider instance
context_provider: Optional[ContextProvider] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting Context-Aware Chat App Backend")
    await initialize_context_provider()
    yield
    # Shutdown
    logger.info("👋 Shutting down Context-Aware Chat App Backend")


async def initialize_context_provider():
    """Initialize the context provider with PDF processing and embeddings"""
    global context_provider

    try:
        logger.info("Initializing context provider...")
        context_provider = ContextProvider()

        # Initialize in background (this may take time for large PDFs)
        success = context_provider.initialize()

        if success:
            logger.info("✅ Context provider initialized successfully")
        else:
            logger.error("❌ Failed to initialize context provider")
            context_provider = None
    except Exception as e:
        logger.error(f"❌ Error initializing context provider: {e}")
        context_provider = None


app = FastAPI(
    title="Context-Aware Chat App Backend",
    description="A modern Python backend for the context-aware chat application with PDF context",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class ChatMessage(BaseModel):
    id: Optional[str] = None
    message: str
    user_id: str
    timestamp: Optional[str] = None


class ContextChatRequest(BaseModel):
    message: str
    user_id: str


class ContextChatResponse(BaseModel):
    response: str
    context_used: bool = False
    context_pages: Optional[List[int]] = None
    chunks_used: Optional[int] = None
    success: bool = True
    error: Optional[str] = None


# In-memory storage for demo (replace with database in production)
messages_store: List[ChatMessage] = []


@app.get("/")
async def root():
    return {
        "message": "Context-Aware Chat App Backend API",
        "status": "running",
        "context_provider_ready": context_provider is not None
        and context_provider.is_ready,
    }


@app.post("/chat", response_model=ContextChatResponse)
async def chat_endpoint(request: ContextChatRequest):
    """
    Process a chat message using PDF context and return a response.
    """
    global context_provider

    # Check if context provider is ready
    if not context_provider or not context_provider.is_ready:
        return ContextChatResponse(
            response="I'm sorry, but the context system is not ready yet. Please try again in a moment.",
            context_used=False,
            success=False,
            error="Context provider not initialized",
        )

    try:
        # Store the message
        message = ChatMessage(
            id=str(len(messages_store) + 1),
            message=request.message,
            user_id=request.user_id,
        )
        messages_store.append(message)

        # Get response from context provider
        result = context_provider.chat(request.message)

        if result.get("success", False):
            return ContextChatResponse(
                response=result["answer"],
                context_used=result["chunks_used"] > 0,
                context_pages=result.get("context_pages", []),
                chunks_used=result.get("chunks_used", 0),
                success=True,
            )
        else:
            return ContextChatResponse(
                response="I encountered an error while processing your question. Please try again.",
                context_used=False,
                success=False,
                error=result.get("error", "Unknown error"),
            )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ContextChatResponse(
            response="I'm sorry, there was an error processing your request.",
            context_used=False,
            success=False,
            error=str(e),
        )


@app.get("/messages", response_model=List[ChatMessage])
async def get_messages():
    """Get all chat messages."""
    return messages_store


@app.delete("/messages/clear")
async def clear_messages():
    """Clear all chat messages."""
    global messages_store
    messages_store = []
    return {"message": "All messages cleared"}


@app.get("/context/status")
async def get_context_status():
    """Get context provider status and statistics"""
    if not context_provider:
        return {"status": "not_initialized", "ready": False}

    return {
        "status": "ready" if context_provider.is_ready else "initializing",
        "ready": context_provider.is_ready,
        "chunks_count": (
            len(context_provider.chunks) if context_provider.is_ready else 0
        ),
        "pdf_path": settings.pdf_path,
        "model": settings.openai_model,
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "context_provider_status": (
            "ready" if context_provider and context_provider.is_ready else "not_ready"
        ),
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
