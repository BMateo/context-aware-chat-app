from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import logging
from contextlib import asynccontextmanager
from config import settings
from services.context_provider import ContextProvider
import os
from dotenv import load_dotenv
import uvicorn
import json
import asyncio
import tempfile

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
    logger.info("📄 No PDF loaded - waiting for user upload")
    # Remove automatic initialization - users will upload their own PDFs
    yield
    # Shutdown
    logger.info("👋 Shutting down Context-Aware Chat App Backend")


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
    chat_id: str
    timestamp: Optional[str] = None


class ContextChatRequest(BaseModel):
    message: str
    chat_id: str


# In-memory storage for demo (replace with database in production)
messages_store: List[ChatMessage] = []


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


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a new PDF file and reinitialize the context provider.
    Maximum file size: 30MB
    """
    global context_provider

    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Check file size (30MB limit)
    MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024  # Convert MB to bytes

    # Read file content to check size
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size ({file_size / (1024*1024):.1f}MB) exceeds maximum allowed size ({settings.max_file_size_mb}MB)",
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    try:
        # Create a temporary file to save the uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            # Write the file content to temp file
            temp_file.write(file_content)
            temp_pdf_path = temp_file.name

        # Update the PDF path in settings
        settings.pdf_path = temp_pdf_path

        # Reinitialize context provider with new PDF
        logger.info(
            f"Processing uploaded PDF: {file.filename} ({file_size / (1024*1024):.1f}MB)"
        )
        context_provider = ContextProvider()
        success = context_provider.initialize()

        if success:
            logger.info("✅ Context provider initialized successfully")
            return {
                "message": f"PDF '{file.filename}' uploaded and processed successfully",
                "filename": file.filename,
                "file_size_mb": round(file_size / (1024 * 1024), 1),
                "status": "ready",
                "chunks_count": len(context_provider.chunks),
                # Include complete health status for frontend
                "health_status": {
                    "context_provider_ready": True,
                    "pdf_loaded": True,
                    "chunks_count": len(context_provider.chunks),
                    "message": f"Ready with {len(context_provider.chunks)} chunks",
                },
                "success": True,
            }
        else:
            logger.error("❌ Failed to initialize context provider")
            return {
                "message": "Failed to process the uploaded PDF",
                "filename": file.filename,
                "status": "error",
                "health_status": {
                    "context_provider_ready": False,
                    "pdf_loaded": False,
                    "chunks_count": 0,
                    "message": "Failed to process PDF - please try again",
                },
                "success": False,
            }

    except Exception as e:
        logger.error(f"Error processing uploaded PDF: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Error processing PDF: {str(e)}",
                "health_status": {
                    "context_provider_ready": False,
                    "pdf_loaded": False,
                    "chunks_count": 0,
                    "message": "Error processing PDF - please try again",
                },
                "success": False,
            },
        )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "context_provider_status": (
            "ready"
            if context_provider and context_provider.is_ready
            else "no_pdf_loaded"
        ),
        "context_provider_ready": context_provider is not None
        and context_provider.is_ready,
        "pdf_loaded": context_provider is not None and context_provider.is_ready,
        "chunks_count": (
            len(context_provider.chunks)
            if context_provider and context_provider.is_ready
            else 0
        ),
        "message": (
            f"Ready with {len(context_provider.chunks)} chunks"
            if context_provider and context_provider.is_ready
            else "Please upload a PDF file to start chatting"
        ),
    }


async def generate_chat_stream(request: ContextChatRequest):
    """Generate streaming chat response"""
    global context_provider

    # Check if context provider is ready
    if not context_provider or not context_provider.is_ready:
        yield f"data: {json.dumps({'type': 'error', 'error': 'Context provider not initialized', 'success': False})}\n\n"
        return

    try:
        # Store the message
        message = ChatMessage(
            id=str(len(messages_store) + 1),
            message=request.message,
            chat_id=request.chat_id,
        )
        messages_store.append(message)

        # Get message history for this chat (including the current message)
        chat_messages = []
        current_chat_messages = [
            msg for msg in messages_store if msg.chat_id == request.chat_id
        ]

        # Build conversation history with proper role detection
        for i, msg in enumerate(current_chat_messages):
            # If it's the message we just added, it's a human message
            if msg.message == request.message and i == len(current_chat_messages) - 1:
                role = "human"
            else:
                # Alternate between human and AI based on position
                # Odd positions (1st, 3rd, 5th...) are human messages
                # Even positions (2nd, 4th, 6th...) are AI responses
                role = "human" if i % 2 == 0 else "ai"

            chat_messages.append(
                {"role": role, "content": msg.message, "message": msg.message}
            )

        # Stream the response with conversation history
        for chunk in context_provider.chat_stream(request.message, chat_messages):
            yield f"data: {json.dumps(chunk)}\n\n"
            await asyncio.sleep(0.05)  # Small delay to prevent overwhelming the client

    except Exception as e:
        logger.error(f"Error in streaming chat endpoint: {e}")
        yield f"data: {json.dumps({'type': 'error', 'error': str(e), 'success': False})}\n\n"


@app.get("/chat/stream")
async def chat_stream_endpoint(message: str, chat_id: str = "default"):
    """
    Process a chat message using PDF context and return a streaming response.
    """
    request = ContextChatRequest(message=message, chat_id=chat_id)
    return StreamingResponse(
        generate_chat_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
