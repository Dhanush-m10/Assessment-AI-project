"""Assessment AI - AI / processing service (FastAPI).

This service owns AI question generation (Phase 3B):
  GET  /health          liveness (no auth)
  POST /generate-mcq    batch MCQ generation (shared-secret auth)
  POST /generate-coding batch coding-challenge generation (shared-secret auth)

Responsibility split (docs/DECISIONS.md): this service owns AI generation and
structured AI processing; apps/web owns auth, persistence and lifecycle, and
validates generated questions against the live database (Phase 3C).
"""

from fastapi import FastAPI

from .routes.generate import router as generate_router

app = FastAPI(
    title="Assessment AI - AI Service",
    version="0.2.0",
    description="AI question/coding-question generation and structured processing service.",
)

app.include_router(generate_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe for deployments and for apps/web.

    Deliberately independent of generation configuration: a missing
    GEMINI_API_KEY must not fail this endpoint.
    """
    return {"status": "ok", "service": "ai-service"}
