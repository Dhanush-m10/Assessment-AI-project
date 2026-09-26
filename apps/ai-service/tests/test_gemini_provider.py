"""Provider-level unit tests for GeminiProvider.

The Google GenAI SDK client is ALWAYS faked — no credentials, no network.
These prove the SDK is invoked correctly (model, JSON mode, bounded
timeout) and that every SDK/transport failure maps onto the existing typed
provider errors without leaking secrets.
"""
from __future__ import annotations

import httpx
import pytest
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from app.config import DEFAULT_MODEL, DEFAULT_PROVIDER_TIMEOUT_SECONDS
from app.providers import ProviderError, ProviderTimeoutError
from app.providers import gemini_provider as gp

API_KEY = "AIzaTESTfakekey-do-not-log"
SYSTEM = "You are a question generator. Respond with JSON only."
USER = "Generate 2 MEDIUM MCQs for Aptitude."


class _FakeResponse:
    def __init__(self, text: str | None) -> None:
        self.text = text


class _FakeModels:
    def __init__(self, text: str | None = None, exc: Exception | None = None) -> None:
        self.text = text
        self.exc = exc
        self.calls: list[dict] = []

    def generate_content(self, **kwargs) -> _FakeResponse:
        self.calls.append(kwargs)
        if self.exc is not None:
            raise self.exc
        return _FakeResponse(self.text)


class _FakeClient:
    def __init__(self, text: str | None = None, exc: Exception | None = None) -> None:
        self.models = _FakeModels(text, exc)


def _install_fake_client(monkeypatch, text: str | None = None, exc: Exception | None = None):
    """Patch the SDK Client in the provider module; return (captures, fake)."""
    captures: dict = {}
    fake = _FakeClient(text, exc)

    class _ClientSpy:
        def __init__(self, **kwargs) -> None:
            captures["client_kwargs"] = kwargs
            self.models = fake.models

    monkeypatch.setattr(gp.genai, "Client", _ClientSpy)
    return captures, fake


def _make_provider() -> gp.GeminiProvider:
    return gp.GeminiProvider(
        api_key=API_KEY,
        model=DEFAULT_MODEL,
        timeout_seconds=DEFAULT_PROVIDER_TIMEOUT_SECONDS,
    )


# ------------------------------------------------------------- client wiring


def test_client_constructed_with_key_and_bounded_timeout(monkeypatch):
    captures, _ = _install_fake_client(monkeypatch, text='{"questions": []}')
    _make_provider()
    kwargs = captures["client_kwargs"]
    assert kwargs["api_key"] == API_KEY
    options = kwargs["http_options"]
    assert isinstance(options, genai_types.HttpOptions)
    assert options.timeout == int(DEFAULT_PROVIDER_TIMEOUT_SECONDS * 1000)


# ------------------------------------------------------------ SDK invocation


def test_generate_json_invokes_gemini_25_flash_in_native_json_mode(monkeypatch):
    captures, fake = _install_fake_client(monkeypatch, text='{"questions": [{"question": "Q"}]}')
    provider = _make_provider()
    result = provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)
    assert result == {"questions": [{"question": "Q"}]}
    assert len(fake.models.calls) == 1  # one SDK call per generation batch
    call = fake.models.calls[0]
    assert call["model"] == "gemini-2.5-flash"  # exact pinned model identifier
    assert call["contents"] == USER
    config = call["config"]
    assert isinstance(config, genai_types.GenerateContentConfig)
    assert config.system_instruction == SYSTEM
    assert config.response_mime_type == "application/json"  # native JSON mode
    assert config.temperature == 0.2
    # Exactly the three settings we intend — no tools, grounding, function
    # calling, web search or anything else reaches the API.
    assert set(config.model_fields_set) == {
        "system_instruction",
        "response_mime_type",
        "temperature",
    }


# ---------------------------------------------------------- error translation


@pytest.mark.parametrize(
    "exc",
    [httpx.ReadTimeout("read timed out"), httpx.ConnectTimeout("connect timed out")],
)
def test_timeout_maps_to_provider_timeout_error(monkeypatch, exc):
    _install_fake_client(monkeypatch, exc=exc)
    provider = _make_provider()
    with pytest.raises(ProviderTimeoutError):
        provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)


def test_api_error_maps_to_safe_provider_error(monkeypatch):
    # The response body deliberately contains the key: it must never leak.
    _install_fake_client(
        monkeypatch,
        exc=genai_errors.APIError(503, {"error": "unavailable", "key": API_KEY}),
    )
    provider = _make_provider()
    with pytest.raises(ProviderError) as excinfo:
        provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)
    assert isinstance(excinfo.value, ProviderError)
    assert not isinstance(excinfo.value, ProviderTimeoutError)
    assert "503" in str(excinfo.value)  # status code is safe for logs
    assert API_KEY not in str(excinfo.value)
    assert "unavailable" not in str(excinfo.value)  # no raw provider detail


def test_connection_error_maps_to_provider_error(monkeypatch):
    _install_fake_client(monkeypatch, exc=httpx.ConnectError("connection refused"))
    provider = _make_provider()
    with pytest.raises(ProviderError) as excinfo:
        provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)
    assert not isinstance(excinfo.value, ProviderTimeoutError)
    assert "connection refused" not in str(excinfo.value)


def test_unexpected_error_is_never_leaked(monkeypatch):
    _install_fake_client(monkeypatch, exc=ValueError("internal sdk state"))
    provider = _make_provider()
    with pytest.raises(ProviderError) as excinfo:
        provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)
    assert "internal sdk state" not in str(excinfo.value)
    assert API_KEY not in str(excinfo.value)


# ------------------------------------------------------------------ parsing


def test_empty_content_is_provider_error(monkeypatch):
    for text in (None, "   "):
        _install_fake_client(monkeypatch, text=text)
        provider = _make_provider()
        with pytest.raises(ProviderError):
            provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)


def test_non_object_json_is_provider_error(monkeypatch):
    _install_fake_client(monkeypatch, text="[1, 2, 3]")
    provider = _make_provider()
    with pytest.raises(ProviderError):
        provider.generate_json(system_prompt=SYSTEM, user_prompt=USER)


def test_parse_json_object_still_tolerates_accidental_fence():
    assert gp._parse_json_object('```json\n{"questions": []}\n```') == {"questions": []}
