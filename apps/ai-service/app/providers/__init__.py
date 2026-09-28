"""Provider abstraction.

The service depends only on this interface; no Gemini-specific detail leaks
into routes or validation. GeminiProvider (gemini_provider.py) is the only
implementation in this phase.
"""
from __future__ import annotations

from typing import Any, Protocol

__all__ = [
    "GenerationProvider",
    "ProviderError",
    "ProviderTimeoutError",
]


class ProviderError(RuntimeError):
    """The provider failed (network, HTTP error, empty/unusable response).

    The message is safe to log; routes map this to a controlled error and
    never expose provider exception details to clients.
    """


class ProviderTimeoutError(ProviderError):
    """The provider did not answer within the bounded timeout."""


def safe_log_detail(value: object, limit: int = 300) -> str:
    """Bounded, whitespace-flattened detail for server-side log lines.

    Callers pass only provider error text (exception class/name, HTTP/API
    status codes, provider error messages). Never pass the API key, the
    shared secret, authorization headers, or prompt content — this helper
    only bounds and flattens, it does not redact.
    """
    return " ".join(str(value).split())[:limit]


class GenerationProvider(Protocol):
    """One generation call -> one parsed JSON object (dict)."""

    model: str

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Run one generation and return the parsed JSON object.

        Raises ProviderTimeoutError or ProviderError on any failure — the
        provider must never let a raw SDK exception escape.
        """
