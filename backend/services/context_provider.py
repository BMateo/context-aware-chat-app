from openai import OpenAI
import numpy as np
from typing import List, Dict
from dataclasses import dataclass
import logging
import sys

sys.path.append("..")
from config import settings
from services.pdf_processor import PDFProcessor, DocumentChunk
from services.token_tracker import token_tracker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class RelevantChunk:
    """Represents a chunk with its relevance score"""

    chunk: DocumentChunk
    similarity_score: float


class ContextProvider:
    """Simplified context provider using OpenAI embeddings and LLM"""

    def __init__(self, model: str = None):
        logger.info(f"Initializing ContextProvider with pdf_path: {settings.pdf_path}")
        self.pdf_path = settings.pdf_path
        self.model = model or settings.openai_model
        self.pdf_processor = PDFProcessor(pdf_path=self.pdf_path)
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.chunks: List[DocumentChunk] = []
        self.chunk_embeddings: List[List[float]] = []
        self.is_ready = False

    def initialize(self) -> bool:
        """Initialize by processing PDF and generating embeddings once"""
        logger.info("Initializing context provider...")

        # Process PDF
        if not self.pdf_processor.process_pipeline():
            logger.error("Failed to process PDF")
            return False

        self.chunks = self.pdf_processor.chunks

        # Generate embeddings for all chunks
        logger.info("Generating embeddings for chunks...")
        texts = [chunk.content for chunk in self.chunks]
        self.chunk_embeddings = self._generate_embeddings_batch(texts)

        self.is_ready = True
        logger.info(f"✅ Context provider initialized with {len(self.chunks)} chunks")
        return True

    def _generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        batch_size = settings.embedding_batch_size

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                response = self.client.embeddings.create(
                    model=settings.embedding_model, input=batch
                )

                # Track token usage
                if hasattr(response, "usage") and response.usage:
                    token_tracker.track_embedding_usage(response.usage)

                batch_embeddings = [data.embedding for data in response.data]
                embeddings.extend(batch_embeddings)
                logger.info(f"Generated embeddings for batch {i//batch_size + 1}")
            except Exception as e:
                logger.error(f"Failed to generate embeddings: {e}")
                embeddings.extend([[] for _ in batch])

        return embeddings

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        vec1, vec2 = np.array(vec1), np.array(vec2)
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    def _find_relevant_chunks(
        self, query: str, top_k: int = None
    ) -> List[RelevantChunk]:
        """Find most relevant chunks for the query"""
        top_k = top_k or settings.top_k_chunks

        try:
            response = self.client.embeddings.create(
                model=settings.embedding_model, input=query
            )
            query_embedding = response.data[0].embedding

            # Track token usage for query embedding
            if hasattr(response, "usage") and response.usage:
                token_tracker.track_embedding_usage(response.usage)

        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            return []

        similarities = []
        for chunk_embedding in self.chunk_embeddings:
            if chunk_embedding:
                similarity = self._cosine_similarity(query_embedding, chunk_embedding)
                similarities.append(similarity)
            else:
                similarities.append(0.0)

        # Get top-k most similar chunks
        top_indices = np.argsort(similarities)[::-1][:top_k]

        relevant_chunks = []
        for idx in top_indices:
            if similarities[idx] > settings.similarity_threshold:
                relevant_chunks.append(
                    RelevantChunk(
                        chunk=self.chunks[idx], similarity_score=similarities[idx]
                    )
                )

        return relevant_chunks

    def chat_stream(self, query: str, message_history: List = None):
        """Process query and return streaming response with context and conversation history"""
        if not self.is_ready:
            yield {"error": "Context provider not initialized", "success": False}
            return

        # Find relevant chunks
        relevant_chunks = self._find_relevant_chunks(query)

        # Build context
        context = "\n\n".join(
            [
                f"{chunk.chunk.content}"
                for chunk in relevant_chunks
            ]
        )

        # Build conversation history
        conversation_history = ""
        if message_history and len(message_history) > 1:
            # Get the last 10 messages to avoid making the prompt too long
            recent_messages = message_history[-10:]
            history_parts = []
            for msg in recent_messages[:-1]:  # Exclude the current message
                role = "User" if msg.get("role") == "human" else "Assistant"
                content = msg.get("message", msg.get("content", ""))
                if content.strip():
                    history_parts.append(f"{role}: {content}")

            if history_parts:
                conversation_history = f"""

CONVERSATION HISTORY:
{chr(10).join(history_parts)}
"""

        # Create enhanced prompt with history
        prompt = f"""
You are an intelligent assistant trained on the following PDF content. Answer the user's question based **only** on the context provided below.

If the question isn't related to the context or there's not enough information to answer it meaningfully, respond politely and conversationally — don't guess or make up facts. It's okay to be a bit playful or redirect the user to ask something relevant.

Use the conversation history to understand the context of the current question and provide more relevant, coherent responses.

CONTEXT:
{context}{conversation_history}

CURRENT QUESTION: {query}

Your response:
"""

        try:
            # First, send metadata about the context
            yield {
                "type": "metadata",
                "chunks_used": len(relevant_chunks),
                "success": True,
            }

            # Stream the response and accumulate content
            accumulated_content = ""
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=settings.openai_max_tokens,
                temperature=settings.openai_temperature,
                stream=True,
                stream_options={"include_usage": True},  # Include usage in streaming
            )

            for chunk in stream:
                if (
                    len(chunk.choices) > 0
                    and chunk.choices[0].delta.content is not None
                ):
                    content_chunk = chunk.choices[0].delta.content
                    accumulated_content += content_chunk
                    yield {
                        "type": "content",
                        "content": content_chunk,
                        "success": True,
                    }
                
                # Track usage when available (usually in the last chunk)
                if hasattr(chunk, "usage") and chunk.usage:
                    token_tracker.track_chat_usage(chunk.usage, self.model)

            # Send completion signal with accumulated content
            yield {
                "type": "done", 
                "success": True,
                "accumulated_content": accumulated_content
            }

        except Exception as e:
            logger.error(f"Failed to generate streaming response: {e}")
            yield {
                "type": "error",
                "error": "Failed to generate response",
                "success": False,
            }
