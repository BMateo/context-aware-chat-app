"""
Token Usage Tracker for OpenAI API calls
Tracks tokens and estimated costs for the current session
"""

import logging
from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TokenUsage:
    """Represents token usage for a single API call"""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
    call_type: str = "unknown"  # "embedding", "chat", etc.


@dataclass
class SessionStats:
    """Aggregated statistics for the entire session"""

    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    embedding_calls: int = 0
    chat_calls: int = 0
    total_api_calls: int = 0
    estimated_cost_usd: float = 0.0
    session_start: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)


class TokenTracker:
    """Singleton class to track OpenAI API token usage across the session"""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TokenTracker, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.session_stats = SessionStats()
            self.call_history: list[TokenUsage] = []
            self._pricing = {
                # GPT-3.5-turbo pricing (per 1K tokens)
                "gpt-3.5-turbo": {
                    "input": 0.0015,  # $0.0015 per 1K input tokens
                    "output": 0.002,  # $0.002 per 1K output tokens
                },
                # GPT-4 pricing (per 1K tokens)
                "gpt-4": {
                    "input": 0.03,  # $0.03 per 1K input tokens
                    "output": 0.06,  # $0.06 per 1K output tokens
                },
                # Embedding pricing (per 1K tokens)
                "text-embedding-ada-002": {
                    "input": 0.0001,  # $0.0001 per 1K tokens
                    "output": 0.0,  # No output tokens for embeddings
                },
            }
            TokenTracker._initialized = True
            logger.info("🔢 Token tracker initialized")

    def track_embedding_usage(self, usage_data) -> None:
        """Track token usage for embedding API calls"""
        if not usage_data:
            return

        token_usage = TokenUsage(
            prompt_tokens=getattr(usage_data, "prompt_tokens", 0),
            completion_tokens=0,  # Embeddings don't have completion tokens
            total_tokens=getattr(usage_data, "total_tokens", 0),
            call_type="embedding",
        )

        self._add_usage(token_usage)
        self.session_stats.embedding_calls += 1
        logger.info(f"📊 Embedding tokens: {token_usage.total_tokens}")

    def track_chat_usage(self, usage_data, model: str = "gpt-3.5-turbo") -> None:
        """Track token usage for chat completion API calls"""
        if not usage_data:
            return

        token_usage = TokenUsage(
            prompt_tokens=getattr(usage_data, "prompt_tokens", 0),
            completion_tokens=getattr(usage_data, "completion_tokens", 0),
            total_tokens=getattr(usage_data, "total_tokens", 0),
            call_type=f"chat-{model}",
        )

        self._add_usage(token_usage)
        self.session_stats.chat_calls += 1
        logger.info(
            f"💬 Chat tokens: prompt={token_usage.prompt_tokens}, completion={token_usage.completion_tokens}, total={token_usage.total_tokens}"
        )

    def _add_usage(self, usage: TokenUsage) -> None:
        """Add usage to session statistics"""
        self.call_history.append(usage)
        self.session_stats.total_prompt_tokens += usage.prompt_tokens
        self.session_stats.total_completion_tokens += usage.completion_tokens
        self.session_stats.total_tokens += usage.total_tokens
        self.session_stats.total_api_calls += 1
        self.session_stats.last_updated = datetime.now()

        # Update estimated cost
        self._update_estimated_cost(usage)

    def _update_estimated_cost(self, usage: TokenUsage) -> None:
        """Calculate and update estimated costs based on current pricing"""
        cost = 0.0

        if usage.call_type == "embedding":
            # Embedding cost calculation
            model_pricing = self._pricing.get("text-embedding-ada-002", {})
            cost = (usage.prompt_tokens / 1000) * model_pricing.get("input", 0)

        elif usage.call_type.startswith("chat-"):
            # Extract model name from call_type
            model = usage.call_type.replace("chat-", "")
            model_pricing = self._pricing.get(
                model, self._pricing.get("gpt-3.5-turbo", {})
            )

            input_cost = (usage.prompt_tokens / 1000) * model_pricing.get("input", 0)
            output_cost = (usage.completion_tokens / 1000) * model_pricing.get(
                "output", 0
            )
            cost = input_cost + output_cost

        self.session_stats.estimated_cost_usd += cost

    def get_session_stats(self) -> Dict:
        """Get current session statistics"""
        return {
            "total_prompt_tokens": self.session_stats.total_prompt_tokens,
            "total_completion_tokens": self.session_stats.total_completion_tokens,
            "total_tokens": self.session_stats.total_tokens,
            "embedding_calls": self.session_stats.embedding_calls,
            "chat_calls": self.session_stats.chat_calls,
            "total_api_calls": self.session_stats.total_api_calls,
            "estimated_cost_usd": round(self.session_stats.estimated_cost_usd, 6),
            "session_duration_minutes": (
                datetime.now() - self.session_stats.session_start
            ).total_seconds()
            / 60,
            "session_start": self.session_stats.session_start.isoformat(),
            "last_updated": self.session_stats.last_updated.isoformat(),
        }


# Global instance
token_tracker = TokenTracker()
