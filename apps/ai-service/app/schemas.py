"""Strict Pydantic models for the generation endpoints.

These models serve three roles:
  1. Request validation (422 on invalid client input).
  2. Provider-output validation (a malformed LLM payload must NOT pass).
  3. Response serialization (no provider-specific raw structures ever leave
     the service).

Deliberately NOT validated here (application layer, Phase 3C):
  - skill/area/job-title IDs against the live database,
  - duplicate detection against the live question bank.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

# ---------------------------------------------------------------- constants

AssessmentFlow = Literal["GENERAL", "BASIC_MCQ", "BASIC_SKILLS_MCQ", "CODING"]
Difficulty = Literal["EASY", "MEDIUM", "HARD"]
TestCaseVisibility = Literal["PUBLIC", "HIDDEN"]

# D-LIMITS bounds (apps/web/lib/assessment/limits.ts): MCQ 1-50, coding 1-10.
MCQ_COUNT_MIN = 1
MCQ_COUNT_MAX = 50
CODING_COUNT_MIN = 1
CODING_COUNT_MAX = 10

MCQ_OPTIONS_COUNT = 4


def _optional_non_empty(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


# ------------------------------------------------------------------- requests


class McqGenerationRequest(BaseModel):
    """Request to generate a batch of MCQs.

    Context fields (skill/job_title/area) are prompt context only; the
    application layer attaches authoritative metadata to the persisted rows.
    """

    flow: AssessmentFlow
    difficulty: Difficulty
    count: int = Field(ge=MCQ_COUNT_MIN, le=MCQ_COUNT_MAX)
    skill: str | None = Field(default=None, max_length=100)
    job_title: str | None = Field(default=None, max_length=120)
    area: str | None = Field(default=None, max_length=120)

    @field_validator("skill", "job_title", "area")
    @classmethod
    def _clean(cls, value: str | None) -> str | None:
        return _optional_non_empty(value)


class CodingGenerationRequest(BaseModel):
    """Request to generate a batch of coding challenges (CODING flow only)."""

    flow: Literal["CODING"]
    difficulty: Difficulty
    count: int = Field(ge=CODING_COUNT_MIN, le=CODING_COUNT_MAX)
    skill: str | None = Field(default=None, max_length=100)
    job_title: str | None = Field(default=None, max_length=120)
    language: str = Field(min_length=1, max_length=30)

    @field_validator("skill", "job_title")
    @classmethod
    def _clean(cls, value: str | None) -> str | None:
        return _optional_non_empty(value)

    @field_validator("language")
    @classmethod
    def _language(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("language must not be empty")
        return value


# -------------------------------------------------------------------- MCQ items


class McqOption(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    is_correct: bool


class McqItem(BaseModel):
    """One generated MCQ. Structural invariants are enforced here so an
    invalid LLM payload can never be returned (or persisted downstream)."""

    question: str = Field(min_length=1, max_length=1000)
    options: list[McqOption]
    difficulty: Difficulty

    @model_validator(mode="after")
    def _check_invariants(self) -> "McqItem":
        if not self.question.strip():
            raise ValueError("question text must be non-empty")
        if len(self.options) != MCQ_OPTIONS_COUNT:
            raise ValueError(f"exactly {MCQ_OPTIONS_COUNT} options required")
        if sum(1 for o in self.options if o.is_correct) != 1:
            raise ValueError("exactly one correct option required")
        texts = [o.text.strip().lower() for o in self.options]
        if len(set(texts)) != len(texts):
            raise ValueError("options must be distinct")
        return self


class McqGenerationResponse(BaseModel):
    questions: list[McqItem]


# ------------------------------------------------------------------ coding items


class CodingTestCaseItem(BaseModel):
    # `input` may legitimately be empty (programs with no stdin).
    input: str = Field(max_length=2000)
    expected_output: str = Field(max_length=2000)
    visibility: TestCaseVisibility


class CodingItem(BaseModel):
    """One generated coding challenge.

    Structural invariants (D-CODE ready): at least one PUBLIC and one HIDDEN
    test, no duplicate test inputs, non-empty title/problem/starter code.
    """

    title: str = Field(min_length=1, max_length=200)
    problem_statement: str = Field(min_length=1, max_length=4000)
    language: str = Field(min_length=1, max_length=30)
    starter_code: str = Field(max_length=8000)
    constraints: str | None = Field(default=None, max_length=2000)
    test_cases: list[CodingTestCaseItem]
    difficulty: Difficulty

    @model_validator(mode="after")
    def _check_invariants(self) -> "CodingItem":
        if not self.title.strip():
            raise ValueError("title must be non-empty")
        if not self.problem_statement.strip():
            raise ValueError("problem statement must be non-empty")
        if not self.starter_code.strip():
            raise ValueError("starter code must be non-empty")
        if not self.language.strip():
            raise ValueError("language must be non-empty")
        if not self.test_cases:
            raise ValueError("at least one test case required")
        visibilities = {t.visibility for t in self.test_cases}
        if "PUBLIC" not in visibilities:
            raise ValueError("at least one PUBLIC test case required")
        if "HIDDEN" not in visibilities:
            raise ValueError("at least one HIDDEN test case required")
        inputs = [t.input for t in self.test_cases]
        if len(set(inputs)) != len(inputs):
            raise ValueError("duplicate test inputs within a question")
        return self


class CodingGenerationResponse(BaseModel):
    questions: list[CodingItem]
