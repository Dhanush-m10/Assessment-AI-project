"""Google Gemini provider — the only concrete provider in this phase.

Uses the official Google GenAI Python SDK (``google-genai`` — the successor
to the deprecated ``google-generativeai`` package): one
``client.models.generate_content`` call per batch with Gemini's native
structured-JSON output (``response_mime_type="application/json"``).
Responsibilities:
  - hold the API key server-side only (constructed from settings),
  - enforce a bounded request timeout (client-level http_options),
  - request native JSON output and parse it into a dict,
  - translate every SDK/transport failure into the typed provider errors so
    routes can emit controlled responses,
  - never log or otherwise surface the API key, and never let a raw provider
    exception escape.

No web search, grounding, function calling, code execution or other tools —
question generation is a simple text -> structured JSON request.
"""
from __future__ import annotations

import json
from typing import Any

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from . import ProviderError, ProviderTimeoutError

# Low temperature: these are deterministic, schema-strict generation tasks.
_TEMPERATURE = 0.2


class GeminiProvider:
    def __init__(self, *, api_key: str, model: str, timeout_seconds: float) -> None:
        self.model = model
        # Timeout bounded on the client (milliseconds) so a hung call cannot
        # block the route.
        self._client = genai.Client(
            api_key=api_key,
            http_options=genai_types.HttpOptions(timeout=int(timeout_seconds * 1000)),
        )

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    # Gemini's native structured-JSON mode: the model is
                    # constrained to emit parseable JSON (no markdown
                    # wrapper); the route's Pydantic layer still validates
                    # the exact response schema.
                    response_mime_type="application/json",
                    temperature=_TEMPERATURE,
                ),
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("provider timed out") from exc
        except genai_errors.APIError as exc:
            # Status/response details stay server-side; only the numeric
            # status code is carried for logging, never to the client.
            raise ProviderError(f"provider API error: {exc.code}") from exc
        except httpx.TransportError as exc:
            raise ProviderError("provider connection failed") from exc
        except Exception as exc:  # defensive: never leak an unexpected error
            raise ProviderError(f"provider failure: {type(exc).__name__}") from exc

        content = response.text if response is not None else None
        if content is None or not content.strip():
            raise ProviderError("provider returned empty content")
        return _parse_json_object(content)


def _parse_json_object(content: str) -> dict[str, Any]:
    """Parse model output into a JSON object, tolerating an accidental
    markdown fence (native JSON mode should not produce one, but the
    tolerance is cheap). Raises ProviderError (not a raw JSON error) on
    failure."""
    text = content.strip()
    if text.startswith("```"):
        # Strip a single leading/trailing code fence if the model added one.
        text = text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ProviderError("provider output is not valid JSON") from exc
    if not isinstance(data, dict):
        raise ProviderError("provider output is not a JSON object")
    return data
