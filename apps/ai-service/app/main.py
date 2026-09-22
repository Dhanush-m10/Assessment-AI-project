"""Assessment AI - AI / processing service (FastAPI).

Phase 0 scope: application object + health check only.
AI generation, JD processing and scoring endpoints arrive in later phases
(see docs/DECISIONS.md for the phase plan and responsibility split:
this service owns AI question/coding-question/JD generation and structured
AI processing; apps/web owns auth, persistence and lifecycle).
"""

from fastapi import FastAPI

app = FastAPI(
    title="Assessment AI - AI Service",
    version="0.1.0",
    description="AI question/JD generation and structured processing service.",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe for deployments and for apps/web in later phases."""
    return {"status": "ok", "service": "ai-service"}
