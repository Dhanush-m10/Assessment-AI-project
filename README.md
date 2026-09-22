# Assessment AI

Assessment platform with exactly four assessment flows — General Assessment,
Basic MCQ, Basic + Skills MCQ and Coding Assessment — combining a question
library, AI-generated fallback content, JD-driven skill extraction and
server-side scoring.

The product/implementation specification lives in
[`docs/spec/admin-flow.pdf`](docs/spec/admin-flow.pdf).
All architecture and product decisions taken so far are recorded in
[`docs/DECISIONS.md`](docs/DECISIONS.md) — that file is the source of truth
where the spec's internal drafts conflicted.

## Repository layout

```
apps/
  web/         Next.js + TypeScript + Tailwind CSS (frontend, API layer,
               Prisma/PostgreSQL, auth, assessment lifecycle)
  ai-service/  Python FastAPI + Pydantic v2 (AI question/JD generation,
               skill extraction, structured AI processing)
docs/
  DECISIONS.md Decision log (schema + product decisions)
  spec/        Product specification (PDF + text export)
```

Responsibility split: `apps/web` owns authentication, authorization, ownership,
database persistence, question selection, scoring and lifecycle.
`apps/ai-service` owns AI generation and structured processing only.
PostgreSQL is the durable source of truth; AI memory never replaces it.

## Getting started

### apps/web (Next.js)

```bash
npm install                 # installs workspace deps
npm run prisma:generate --workspace apps/web   # downloads Prisma engines + generates client
cp apps/web/.env.example apps/web/.env.local   # then fill real values
npm run dev --workspace apps/web
```

Checks:

```bash
npm run typecheck           # tsc --noEmit
npm run lint                # eslint
npm run build               # next build
```

### apps/ai-service (FastAPI)

```bash
cd apps/ai-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
# health check: GET /health
```

## Environment variables

Only variable **names** are documented (see `apps/web/.env.example` and
`docs/DECISIONS.md`). Real values are provided by the project owner per phase
and are never committed.

## Status

- Phase 0 (scaffold): complete — monorepo, configs, Prisma bootstrap,
  FastAPI health check.
- Phase 1 (database schema + migration): next.
