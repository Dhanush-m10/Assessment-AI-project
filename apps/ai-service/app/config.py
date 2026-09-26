"""Server-side configuration for the AI service.

Environment variables (server-only, never exposed to any browser/Next.js
surface — names match docs/DECISIONS.md):
  OPENAI_API_KEY            provider credential (the only holder is this service)
  AI_SERVICE_SHARED_SECRET  service-to-service auth for the generation routes

Design notes:
  - Configuration is read lazily (per call) so tests can patch the environment
    and so GET /health stays available even when generation is not configured.
  - Missing configuration fails clearly WHEN GENERATION IS INVOKED (controlled
    503), never at import time and never from /health.
  - Neither secret is ever logged.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

OPENAI_API_KEY_ENV = "OPENAI_API_KEY"
SHARED_SECRET_ENV = "AI_SERVICE_SHARED_SECRET"

# Provider default per docs/spec (OpenAI provider). A small, current, cheap
# model is a safe default; it is a code-level constant, not a config variable.
DEFAULT_MODEL = "gpt-4o-mini"

# Bounded provider timeout: one generation call for a full batch (<= 50 MCQ /
# <= 10 coding) must finish well within this.
DEFAULT_PROVIDER_TIMEOUT_SECONDS = 60.0


class ConfigurationError(RuntimeError):
    """Required generation configuration is missing or invalid."""


@dataclass(frozen=True)
class GenerationSettings:
    openai_api_key: str
    shared_secret: str
    model: str
    provider_timeout_seconds: float


def get_shared_secret() -> str:
    """The expected shared secret (empty string when unconfigured)."""
    return (os.environ.get(SHARED_SECRET_ENV) or "").strip()


def get_generation_settings() -> GenerationSettings:
    """Load generation settings; raise ConfigurationError when incomplete.

    Raises ConfigurationError (never an exception that carries secret
    material) when OPENAI_API_KEY or AI_SERVICE_SHARED_SECRET is missing.
    """
    api_key = (os.environ.get(OPENAI_API_KEY_ENV) or "").strip()
    shared_secret = get_shared_secret()
    if not api_key:
        raise ConfigurationError("AI provider credentials are not configured.")
    if not shared_secret:
        raise ConfigurationError("AI service authentication is not configured.")
    return GenerationSettings(
        openai_api_key=api_key,
        shared_secret=shared_secret,
        model=DEFAULT_MODEL,
        provider_timeout_seconds=DEFAULT_PROVIDER_TIMEOUT_SECONDS,
    )
