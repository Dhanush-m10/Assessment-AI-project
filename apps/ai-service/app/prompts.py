"""Small, deterministic generation prompts.

The prompts send ONLY the requested context (flow, difficulty, count,
skill/job-title/area/language). They never send the question bank and never
carry secrets. They instruct the model to return a single JSON object with a
fixed shape and no markdown wrapper; the service re-validates the output
deterministically (schemas.py + routes) and does not trust any part of it.
"""
from __future__ import annotations

from . import schemas

MCQ_SYSTEM_PROMPT = """You are an assessment question generator.
Respond with ONE JSON object and nothing else. No markdown, no code fences, no commentary.
The object must have exactly this shape:
{"questions": [{"question": string, "options": [{"text": string, "is_correct": boolean}, {"text": string, "is_correct": boolean}, {"text": string, "is_correct": boolean}, {"text": string, "is_correct": boolean}], "difficulty": "EASY" | "MEDIUM" | "HARD"}]}
Hard rules:
- Return exactly the requested number of questions.
- Each question has exactly 4 options; all option texts are distinct and non-empty.
- Exactly one option per question has is_correct set to true.
- Every question's difficulty equals the requested difficulty.
- Option texts have no letter/number prefixes (no "A.", "1.") and no explanation of why an option is correct.
- Questions are original, self-contained, and vary in topic within the requested context."""


def build_mcq_prompts(req: schemas.McqGenerationRequest) -> tuple[str, str]:
    context = [
        f"Assessment flow: {req.flow}",
        f"Difficulty: {req.difficulty}",
        f"Number of questions: {req.count}",
    ]
    if req.skill:
        context.append(f"Skill being tested: {req.skill}")
    if req.job_title:
        context.append(f"Job title context: {req.job_title}")
    if req.area:
        context.append(f"Area of interest: {req.area}")
    user_prompt = "Generate the MCQ set now.\n" + "\n".join(context)
    return MCQ_SYSTEM_PROMPT, user_prompt


CODING_SYSTEM_PROMPT = """You are a coding-assessment generator.
Respond with ONE JSON object and nothing else. No markdown, no code fences, no commentary.
The object must have exactly this shape:
{"questions": [{"title": string, "problem_statement": string, "language": string, "starter_code": string, "constraints": string or null, "test_cases": [{"input": string, "expected_output": string, "visibility": "PUBLIC" | "HIDDEN"}], "difficulty": "EASY" | "MEDIUM" | "HARD"}]}
Hard rules:
- Return exactly the requested number of problems.
- Every problem's language equals the requested language.
- starter_code is a valid, runnable starting point in that language. Programs read ALL input from stdin and write ALL output to stdout (plain text, no interactive prompts).
- Each problem has at least two test cases: at least one PUBLIC and at least one HIDDEN. Test inputs must be distinct within a problem.
- expected_output is the exact stdout for that input. Outputs must be deterministic: no randomness, no wall-clock time, no environment-dependent values.
- Every problem's difficulty equals the requested difficulty.
- problem_statement is precise and self-contained. constraints is a short string or null."""


def build_coding_prompts(req: schemas.CodingGenerationRequest) -> tuple[str, str]:
    context = [
        f"Difficulty: {req.difficulty}",
        f"Number of problems: {req.count}",
        f"Language: {req.language}",
    ]
    if req.skill:
        context.append(f"Skill being tested: {req.skill}")
    if req.job_title:
        context.append(f"Job title context: {req.job_title}")
    user_prompt = "Generate the coding challenge set now.\n" + "\n".join(context)
    return CODING_SYSTEM_PROMPT, user_prompt
