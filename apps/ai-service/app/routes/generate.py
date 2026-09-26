"""POST /generate-mcq and POST /generate-coding.

Per-request pipeline (identical for both routes):
  1. Pydantic request validation            -> 422 (FastAPI default)
  2. shared-secret authentication            -> 401 controlled envelope
  3. configuration check (lazy)              -> 503 controlled envelope
  4. provider call (bounded timeout)         -> 504 / 502 controlled envelope
  5. deterministic output validation         -> 502 controlled envelope
  6. typed response

Error envelope: {"error": <code>, "message": <fixed safe text>}. Nothing the
provider says, and no secret, ever reaches the client.
"""
from __future__ import annotations

import hmac
import re
from typing import Any, Callable, Protocol

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

from .. import prompts, schemas
from ..config import SHARED_SECRET_ENV, ConfigurationError, get_generation_settings
from ..providers import ProviderError, ProviderTimeoutError
from ..providers.gemini_provider import GeminiProvider
import os

router = APIRouter()

SECRET_HEADER = "X-AI-Service-Secret"

# ------------------------------------------------------------------ helpers


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": code, "message": message})


def _is_authorized(request: Request) -> bool:
    """Constant-time shared-secret check. Unconfigured secret => no one may
    generate (fail closed)."""
    expected = (os.environ.get(SHARED_SECRET_ENV) or "").strip()
    provided = request.headers.get(SECRET_HEADER) or ""
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided, expected)


def _normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


class _ProviderFactory(Protocol):
    def __call__(self, settings: Any) -> Any: ...


# Module-level so tests can monkeypatch it; production constructs the real
# Gemini provider from settings (the key is read from the environment only).
def build_provider(settings: Any) -> GeminiProvider:
    return GeminiProvider(
        api_key=settings.gemini_api_key,
        model=settings.model,
        timeout_seconds=settings.provider_timeout_seconds,
    )


def _validate_mcq_batch(req: schemas.McqGenerationRequest, resp: schemas.McqGenerationResponse) -> None:
    if len(resp.questions) != req.count:
        raise ValueError(f"expected {req.count} questions, got {len(resp.questions)}")
    seen: set[str] = set()
    for item in resp.questions:
        if item.difficulty != req.difficulty:
            raise ValueError("item difficulty does not match the request")
        key = _normalized(item.question)
        if key in seen:
            raise ValueError("duplicate question text within the batch")
        seen.add(key)


def _validate_coding_batch(req: schemas.CodingGenerationRequest, resp: schemas.CodingGenerationResponse) -> None:
    if len(resp.questions) != req.count:
        raise ValueError(f"expected {req.count} problems, got {len(resp.questions)}")
    requested_language = _normalized(req.language)
    seen: set[str] = set()
    for item in resp.questions:
        if item.difficulty != req.difficulty:
            raise ValueError("item difficulty does not match the request")
        if _normalized(item.language) != requested_language:
            raise ValueError("item language does not match the request")
        key = _normalized(item.problem_statement)
        if key in seen:
            raise ValueError("duplicate problem statement within the batch")
        seen.add(key)


def _generate(
    request: Request,
    req: BaseModel,
    *,
    build_prompts: Callable[[BaseModel], tuple[str, str]],
    provider_factory: _ProviderFactory,
    parse_response: Callable[[dict[str, Any]], BaseModel],
    validate_batch: Callable[[BaseModel, BaseModel], None],
) -> JSONResponse | BaseModel:
    """Shared pipeline; see module docstring for the step order."""
    if not _is_authorized(request):
        return _error(401, "unauthorized", "A valid service secret is required.")
    try:
        settings = get_generation_settings()
    except ConfigurationError:
        return _error(
            503,
            "configuration-error",
            "AI generation is not configured on the server. Please contact the administrator.",
        )
    system_prompt, user_prompt = build_prompts(req)
    try:
        provider = provider_factory(settings)
        payload = provider.generate_json(system_prompt=system_prompt, user_prompt=user_prompt)
    except ProviderTimeoutError:
        return _error(504, "provider-timeout", "The question generator timed out. Please try again.")
    except ProviderError:
        return _error(502, "provider-error", "The question generator failed. Please try again.")
    try:
        response = parse_response(payload)
        validate_batch(req, response)
    except (ValidationError, ValueError):
        return _error(
            502,
            "malformed-provider-output",
            "The question generator returned an invalid question set. Please try again.",
        )
    return response


# --------------------------------------------------------------------- routes


@router.post("/generate-mcq", response_model=schemas.McqGenerationResponse)
def generate_mcq(body: schemas.McqGenerationRequest, request: Request):
    return _generate(
        request,
        body,
        build_prompts=prompts.build_mcq_prompts,
        provider_factory=build_provider,
        parse_response=schemas.McqGenerationResponse.model_validate,
        validate_batch=_validate_mcq_batch,
    )


@router.post("/generate-coding", response_model=schemas.CodingGenerationResponse)
def generate_coding(body: schemas.CodingGenerationRequest, request: Request):
    return _generate(
        request,
        body,
        build_prompts=prompts.build_coding_prompts,
        provider_factory=build_provider,
        parse_response=schemas.CodingGenerationResponse.model_validate,
        validate_batch=_validate_coding_batch,
    )
