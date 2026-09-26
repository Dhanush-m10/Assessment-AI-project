"""OpenAI provider — the only concrete provider in this phase.

Uses the official OpenAI Python SDK (v1.x, ``OpenAI`` client +
``client.chat.completions.create``). Responsibilities:
  - hold the API key server-side only (constructed from settings),
  - enforce a bounded request timeout,
  - request JSON-object output and parse it into a dict,
  - translate every SDK/transport failure into the typed provider errors so
    routes can emit controlled responses,
  - never log or otherwise surface the API key, and never let a raw provider
    exception escape.
"""
from __future__ import annotations

import json
from typing import Any

import openai
from openai import OpenAI

from . import ProviderError, ProviderTimeoutError

# Low temperature: these are deterministic, schema-strict generation tasks.
_TEMPERATURE = 0.2


class OpenAIProvider:
    def __init__(self, *, api_key: str, model: str, timeout_seconds: float) -> None:
        self.model = model
        # timeout bounded on the client so a hung call cannot block the route.
        self._client = OpenAI(api_key=api_key, timeout=timeout_seconds)

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        try:
            completion = self._client.chat.completions.create(
                model=self.model,
                temperature=_TEMPERATURE,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except openai.APITimeoutError as exc:
            raise ProviderTimeoutError("provider timed out") from exc
        except openai.APIConnectionError as exc:
            raise ProviderError("provider connection failed") from exc
        except openai.APIError as exc:
            # status/body details stay server-side; only the class name is
            # carried for logging, never to the client.
            raise ProviderError(f"provider API error: {type(exc).__name__}") from exc
        except Exception as exc:  # defensive: never leak an unexpected error
            raise ProviderError(f"provider failure: {type(exc).__name__}") from exc

        content = completion.choices[0].message.content if completion.choices else None
        if content is None or not content.strip():
            raise ProviderError("provider returned empty content")
        return _parse_json_object(content)


def _parse_json_object(content: str) -> dict[str, Any]:
    """Parse model output into a JSON object, tolerating an accidental
    markdown fence. Raises ProviderError (not a raw JSON error) on failure."""
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
