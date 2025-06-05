import PyPDF2
import re
import logging
from typing import List, Dict
from dataclasses import dataclass
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DocumentChunk:
    """Represents a chunk of text from the PDF with metadata"""

    content: str
    page_number: int
    chunk_index: int
    start_char: int
    end_char: int
    word_count: int

    def to_dict(self) -> Dict:
        return {
            "content": self.content,
            "page_number": self.page_number,
            "chunk_index": self.chunk_index,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "word_count": self.word_count,
        }


class PDFProcessor:
    """Main PDF processing pipeline"""

    def __init__(self, pdf_path: str, chunk_size: int = 1000, chunk_overlap: int = 200):
        logger.info(f"Initializing PDFProcessor with pdf_path: {pdf_path}")
        self.pdf_path = Path(pdf_path)
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.raw_text = ""
        self.pages_text = []
        self.chunks = []

    def load_pdf(self) -> bool:
        """Load and extract text from PDF"""
        try:
            logger.info(f"Loading PDF from: {self.pdf_path}")

            if not self.pdf_path.exists():
                raise FileNotFoundError(f"PDF file not found: {self.pdf_path}")

            with open(self.pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)

                logger.info(f"PDF has {len(pdf_reader.pages)} pages")

                # Extract text from each page
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text.strip():  # Only add non-empty pages
                            self.pages_text.append(
                                {"page_number": page_num + 1, "text": page_text}
                            )
                            self.raw_text += (
                                f"\n--- Page {page_num + 1} ---\n{page_text}\n"
                            )
                    except Exception as e:
                        logger.warning(
                            f"Failed to extract text from page {page_num + 1}: {e}"
                        )
                        continue

                logger.info(
                    f"Successfully extracted text from {len(self.pages_text)} pages"
                )
                return True

        except Exception as e:
            logger.error(f"Failed to load PDF: {e}")
            return False

    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove excessive whitespace
        text = re.sub(r"\s+", " ", text)

        # Remove page headers/footers patterns (customize based on your PDF)
        text = re.sub(r"Page \d+", "", text, flags=re.IGNORECASE)

        # Remove special characters that might cause issues
        text = re.sub(r"[^\w\s\.\,\!\?\;\:\-\(\)\[\]\"\']", " ", text)

        # Fix common OCR issues
        text = text.replace("|", "I")  # Common OCR mistake
        text = text.replace("0", "O")  # Only if context suggests letters

        # Normalize spacing
        text = re.sub(r"\s+", " ", text).strip()

        return text

    def create_chunks(self) -> List[DocumentChunk]:
        """Split text into overlapping chunks"""
        chunks = []
        chunk_index = 0

        for page_info in self.pages_text:
            page_number = page_info["page_number"]
            page_text = self.clean_text(page_info["text"])

            # Skip empty pages
            if not page_text.strip():
                continue

            # Split page into chunks
            words = page_text.split()

            i = 0
            while i < len(words):
                # Calculate chunk boundaries
                chunk_words = words[i : i + self.chunk_size]
                chunk_text = " ".join(chunk_words)

                # Calculate character positions (approximate)
                start_char = len(" ".join(words[:i]))
                end_char = start_char + len(chunk_text)

                # Create chunk
                chunk = DocumentChunk(
                    content=chunk_text,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    start_char=start_char,
                    end_char=end_char,
                    word_count=len(chunk_words),
                )

                chunks.append(chunk)
                chunk_index += 1

                # Move to next chunk with overlap
                i += self.chunk_size - self.chunk_overlap

                # Avoid infinite loop on small pages
                if i >= len(words):
                    break

        self.chunks = chunks
        logger.info(f"Created {len(chunks)} chunks")
        return chunks

    def get_statistics(self) -> Dict:
        """Get document statistics"""
        total_words = sum(chunk.word_count for chunk in self.chunks)
        total_chars = sum(len(chunk.content) for chunk in self.chunks)

        return {
            "total_pages": len(self.pages_text),
            "total_chunks": len(self.chunks),
            "total_words": total_words,
            "total_characters": total_chars,
            "avg_words_per_chunk": total_words / len(self.chunks) if self.chunks else 0,
            "avg_chars_per_chunk": total_chars / len(self.chunks) if self.chunks else 0,
        }

    def process_pipeline(self) -> bool:
        """Run the complete processing pipeline"""
        logger.info("Starting PDF processing pipeline...")

        # Step 1: Load PDF
        if not self.load_pdf():
            return False

        # Step 2: Create chunks
        self.create_chunks()

        # Step 3: Display statistics
        stats = self.get_statistics()
        logger.info("Processing completed!")
        logger.info(f"Statistics: {stats}")

        return True
