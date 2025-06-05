from openai import OpenAI
import numpy as np
from typing import List, Dict
from dataclasses import dataclass
import logging
import os
import sys
sys.path.append('..')
from config import settings
from services.pdf_processor import PDFProcessor, DocumentChunk

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
        self.pdf_processor = PDFProcessor(
            pdf_path=self.pdf_path,
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )
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

    def _find_relevant_chunks(self, query: str, top_k: int = None) -> List[RelevantChunk]:
        """Find most relevant chunks for the query"""
        top_k = top_k or settings.top_k_chunks
        
        try:
            query_embedding = (
                self.client.embeddings.create(
                    model=settings.embedding_model, input=query
                )
                .data[0]
                .embedding
            )
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

    def chat(self, query: str) -> Dict:
        """Process query and return response with context"""
        if not self.is_ready:
            return {"error": "Context provider not initialized"}

        # Find relevant chunks
        relevant_chunks = self._find_relevant_chunks(query)

        # Build context
        context = "\n\n".join(
            [
                f"Page {chunk.chunk.page_number}: {chunk.chunk.content}"
                for chunk in relevant_chunks
            ]
        )

        # Create prompt
        prompt = f"""Based on the following context from a PDF document, answer the user's question.

CONTEXT:
{context}

QUESTION: {query}

Please answer based only on the provided context. If the context doesn't contain enough information, say so."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=settings.openai_max_tokens,
                temperature=settings.openai_temperature,
            )

            return {
                "answer": response.choices[0].message.content,
                "context_pages": [chunk.chunk.page_number for chunk in relevant_chunks],
                "chunks_used": len(relevant_chunks),
                "success": True
            }
        except Exception as e:
            logger.error(f"Failed to generate response: {e}")
            return {"error": "Failed to generate response", "success": False}
