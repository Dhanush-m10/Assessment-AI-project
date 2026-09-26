"""Shared fixtures. The Gemini provider is ALWAYS mocked; no test makes a
real network call or requires real credentials."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.providers import ProviderError, ProviderTimeoutError
import app.routes.generate as generate_module

SECRET = "test-shared-secret-do-not-log"
API_KEY = "AIzaTESTfakekey-do-not-log"

HEADERS = {"X-AI-Service-Secret": SECRET}
WRONG_HEADERS = {"X-AI-Service-Secret": "definitely-wrong-secret"}


def _clear_ai_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("AI_SERVICE_SHARED_SECRET", raising=False)


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Client with full configuration (secret + API key)."""
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("AI_SERVICE_SHARED_SECRET", SECRET)
    monkeypatch.setenv("GEMINI_API_KEY", API_KEY)
    return TestClient(app)


@pytest.fixture
def client_no_secret(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Client where the service has no shared secret configured (health must
    still work; generation must fail closed)."""
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("GEMINI_API_KEY", API_KEY)
    return TestClient(app)


@pytest.fixture
def client_no_api_key(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Client configured for auth but missing GEMINI_API_KEY."""
    _clear_ai_env(monkeypatch)
    monkeypatch.setenv("AI_SERVICE_SHARED_SECRET", SECRET)
    return TestClient(app)


class FakeProvider:
    """Stands in for GeminiProvider: returns a canned payload or raises."""

    model = "fake-model"

    def __init__(self, payload: object | None = None, exc: Exception | None = None) -> None:
        self.payload = payload
        self.exc = exc
        self.calls = 0
        self.last_system_prompt: str | None = None
        self.last_user_prompt: str | None = None

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        self.calls += 1
        self.last_system_prompt = system_prompt
        self.last_user_prompt = user_prompt
        if self.exc is not None:
            raise self.exc
        return self.payload


@pytest.fixture
def provider(monkeypatch: pytest.MonkeyPatch):
    """Install a FakeProvider as the provider factory; returns the installer."""

    def _install(payload: object | None = None, exc: Exception | None = None) -> FakeProvider:
        fake = FakeProvider(payload=payload, exc=exc)
        monkeypatch.setattr(generate_module, "build_provider", lambda settings: fake)
        return fake

    return _install


# ------------------------------------------------------------------- payloads


def mcq_payload(n: int = 2, difficulty: str = "MEDIUM") -> dict:
    questions = []
    for i in range(n):
        questions.append(
            {
                "question": f"Question number {i} in the generated set?",
                "options": [
                    {"text": f"Option A for question {i}", "is_correct": i % 2 == 0},
                    {"text": f"Option B for question {i}", "is_correct": i % 2 != 0},
                    {"text": f"Option C for question {i}", "is_correct": False},
                    {"text": f"Option D for question {i}", "is_correct": False},
                ],
                "difficulty": difficulty,
            }
        )
    return {"questions": questions}


def coding_payload(n: int = 1, language: str = "python", difficulty: str = "EASY") -> dict:
    questions = []
    for i in range(n):
        questions.append(
            {
                "title": f"Problem {i}",
                "problem_statement": f"Solve problem {i} by reading stdin and printing the answer to stdout.",
                "language": language,
                "starter_code": "import sys\ndata = sys.stdin.read().strip()\n",
                "constraints": None,
                "test_cases": [
                    {"input": f"input-{i}-1", "expected_output": f"out-{i}-1", "visibility": "PUBLIC"},
                    {"input": f"input-{i}-2", "expected_output": f"out-{i}-2", "visibility": "HIDDEN"},
                ],
                "difficulty": difficulty,
            }
        )
    return {"questions": questions}


MCQ_BODY = {"flow": "GENERAL", "difficulty": "MEDIUM", "count": 2, "area": "Aptitude"}
CODING_BODY = {
    "flow": "CODING",
    "difficulty": "EASY",
    "count": 1,
    "skill": "Python",
    "job_title": "Backend Engineer",
    "language": "python",
}
