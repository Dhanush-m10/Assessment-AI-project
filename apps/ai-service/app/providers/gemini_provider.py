"""Google Gemini provider.

Uses the official Google GenAI Python SDK and Gemini's native JSON output.

The provider:
- keeps the API key server-side only
- uses a bounded client timeout
- requests native JSON output
- retries transient Gemini 503/504 failures once
- converts provider failures into typed application errors
- never exposes the API key or raw provider exceptions
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from . import ProviderError, ProviderTimeoutError, safe_log_detail

_TEMPERATURE = 0.2

# Only retry transient provider availability/deadline failures.
_MAX_RETRIES = 1
_RETRY_DELAY_SECONDS = 1.0

logger = logging.getLogger("ai_service.providers.gemini")


class GeminiProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float,
    ) -> None:
        self.model = model
        self._timeout_seconds = timeout_seconds

        self._client = genai.Client(
            api_key=api_key,
            http_options=genai_types.HttpOptions(
                timeout=int(timeout_seconds * 1000),
            ),
        )

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> dict[str, Any]:
        last_error: Exception | None = None

        for attempt in range(_MAX_RETRIES + 1):
            try:
                response = self._client.models.generate_content(
                    model=self.model,
                    contents=user_prompt,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                        temperature=_TEMPERATURE,
                    ),
                )

                content = response.text if response is not None else None

                if content is None or not content.strip():
                    logger.warning(
                        "Gemini returned empty content: "
                        "model=%s phase=response_parsing attempt=%s",
                        self.model,
                        attempt + 1,
                    )
                    raise ProviderError("provider returned empty content")

                try:
                    return _parse_json_object(content)
                except ProviderError as exc:
                    logger.warning(
                        "Gemini response parsing failed: "
                        "model=%s phase=response_parsing attempt=%s detail=%s",
                        self.model,
                        attempt + 1,
                        safe_log_detail(exc),
                    )
                    raise

            except httpx.TimeoutException as exc:
                last_error = exc

                logger.warning(
                    "Gemini request timed out: "
                    "model=%s phase=generate_content "
                    "timeout_seconds=%s attempt=%s/%s detail=%s",
                    self.model,
                    self._timeout_seconds,
                    attempt + 1,
                    _MAX_RETRIES + 1,
                    safe_log_detail(exc),
                )

                if attempt < _MAX_RETRIES:
                    time.sleep(_RETRY_DELAY_SECONDS)
                    continue

                raise ProviderTimeoutError("provider timed out") from exc

            except genai_errors.APIError as exc:
                last_error = exc

                status_code = getattr(exc, "code", None)

                logger.warning(
                    "Gemini API error: "
                    "model=%s phase=generate_content "
                    "exception=%s http_status=%s api_status=%s "
                    "attempt=%s/%s message=%s",
                    self.model,
                    type(exc).__name__,
                    status_code,
                    safe_log_detail(getattr(exc, "status", "")),
                    attempt + 1,
                    _MAX_RETRIES + 1,
                    safe_log_detail(getattr(exc, "message", "")),
                )

                # 429 = rate limit
                # 500 = provider internal error
                # 502 = bad gateway
                # 503 = unavailable/high demand
                # 504 = provider deadline exceeded
                transient_statuses = {429, 500, 502, 503, 504}

                if (
                    status_code in transient_statuses
                    and attempt < _MAX_RETRIES
                ):
                    time.sleep(_RETRY_DELAY_SECONDS)
                    continue

                if status_code == 504:
                    raise ProviderTimeoutError(
                        "provider request deadline exceeded"
                    ) from exc

                raise ProviderError(
                    f"provider API error: {status_code}"
                ) from exc

            except httpx.TransportError as exc:
                last_error = exc

                logger.warning(
                    "Gemini transport failure: "
                    "model=%s phase=generate_content "
                    "exception=%s attempt=%s/%s detail=%s",
                    self.model,
                    type(exc).__name__,
                    attempt + 1,
                    _MAX_RETRIES + 1,
                    safe_log_detail(exc),
                )

                if attempt < _MAX_RETRIES:
                    time.sleep(_RETRY_DELAY_SECONDS)
                    continue

                raise ProviderError(
                    "provider connection failed"
                ) from exc

            except ProviderError:
                raise

            except Exception as exc:
                last_error = exc

                logger.warning(
                    "Gemini unexpected failure: "
                    "model=%s phase=generate_content "
                    "exception=%s attempt=%s/%s detail=%s",
                    self.model,
                    type(exc).__name__,
                    attempt + 1,
                    _MAX_RETRIES + 1,
                    safe_log_detail(exc),
                )

                raise ProviderError(
                    f"provider failure: {type(exc).__name__}"
                ) from exc

        # Defensive fallback. The loop should always return or raise.
        if last_error is not None:
            raise ProviderError("provider generation failed") from last_error

        raise ProviderError("provider generation failed")


def _parse_json_object(content: str) -> dict[str, Any]:
    """Parse model output into a JSON object.

    Native JSON mode should already produce clean JSON, but a single
    accidental markdown fence is tolerated.
    """

    text = content.strip()

    if text.startswith("```"):
        text = text.strip("`")

        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]

        text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ProviderError(
            "provider output is not valid JSON"
        ) from exc

    if not isinstance(data, dict):
        raise ProviderError(
            "provider output is not a JSON object"
        )

    return data