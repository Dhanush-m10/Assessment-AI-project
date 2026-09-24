import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { selectEligibleQuestions } from "@/lib/assessment/engine";
import { buildSnapshot, parseSnapshot } from "@/lib/assessment/snapshot";
import {
  buildBlueprint,
  difficultyTrials,
  replayState,
  skillNeedOrder,
  NO_SKILL,
  type Difficulty,
  type ServedRow,
} from "@/lib/assessment/adaptive-core";

/**
 * Adaptive Assessment V1 — server glue (Phase 8).
 *
 * The database is the ONLY authoritative state (Part M): every request
 * replays served AssessmentQuestion rows + UserAnswers through the pure core
 * (adaptive-core.ts) to recompute per-skill difficulty states, the blueprint
 * and the next question. Nothing adaptive lives in the browser; the client
 * only ever receives the CURRENT question's safe projection (Part L/P) and
 * only ever sends an option id.
 *
 * Concurrency (Part N): answering + advancing happen through unique
 * constraints — UserAnswer @@unique(assessmentQuestionId) makes a duplicate
 * answer a no-op, AssessmentQuestion @@unique(assessmentId, sequence) makes a
 * racing "serve next" collapse to one row. Losing requests reload and return
 * the same converged state.
 *
 * Served questions are normal AssessmentQuestion rows with normal immutable
 * snapshots (Part K) — submitMcqAssessment, results, history and ownership
 * all keep working unchanged (Part O).
 */

export type AdaptiveQuestionView = {
  id: string;
  sequence: number;
  text: string;
  options: { id: string; text: string }[];
};

export type AdaptiveTakingData = {
  assessmentId: string;
  areaName: string;
  categoryName: string;
  jobTitleName: string | null;
  startDifficulty: string;
  count: number;
  served: number;
  answered: number;
  /** The single current (unanswered) question — never a future set. */
  question: AdaptiveQuestionView | null;
  /** Controlled insufficient-pool state (Part J/Q): no eligible question
   *  remains; the user may finish with the served questions. */
  exhausted: boolean;
  /** served == count and every served question answered → ready to submit. */
  complete: boolean;
};

export type AnswerAdaptiveResult =
  | { ok: true; data: AdaptiveTakingData }
  | { ok: false; error: string };

type CtxRow = {
  id: string;
  sequence: number;
  skillId: string | null;
  libraryQuestionId: string | null;
  snapshot: ReturnType<typeof parseSnapshot>;
  answered: boolean;
  isCorrect: boolean | null;
};

type AdaptiveContext = {
  assessmentId: string;
  userId: string;
  status: string;
  flow: "BASIC_MCQ" | "BASIC_SKILLS_MCQ";
  jobTitleId: string | null;
  start: Difficulty;
  count: number;
  areaName: string;
  categoryName: string;
  jobTitleName: string | null;
  orderedSkillIds: string[];
  rows: CtxRow[];
};

function isP2002(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "P2002";
}

function asDifficulty(value: string | null | undefined, fallback: Difficulty): Difficulty {
  return value === "EASY" || value === "MEDIUM" || value === "HARD" ? value : fallback;
}

/** Loads assessment + ordered skill set + served rows + answers; null when
 *  not owned / not an adaptive MCQ-flow assessment. */
async function loadContext(
  userId: string,
  assessmentId: string,
): Promise<AdaptiveContext | null> {
  const db = getPrisma();
  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId, adaptiveEnabled: true },
    select: {
      id: true,
      status: true,
      flow: true,
      difficulty: true,
      requestedQuestionCount: true,
      jobTitleId: true,
      areaOfInterest: { select: { name: true } },
      category: { select: { name: true } },
      jobTitle: { select: { name: true } },
      skills: { select: { skillId: true, sources: true } },
      questions: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          sequence: true,
          skillId: true,
          libraryQuestionId: true,
          questionSnapshot: true,
        },
      },
    },
  })) as {
    id: string;
    status: string;
    flow: string;
    difficulty: string;
    requestedQuestionCount: number;
    jobTitleId: string | null;
    areaOfInterest: { name: string };
    category: { name: string };
    jobTitle: { name: string } | null;
    skills: { skillId: string; sources: string[] }[];
    questions: {
      id: string;
      sequence: number;
      skillId: string | null;
      libraryQuestionId: string | null;
      questionSnapshot: unknown;
    }[];
  } | null;
  if (!assessment) return null;
  if (assessment.flow !== "BASIC_MCQ" && assessment.flow !== "BASIC_SKILLS_MCQ") return null;

  const answers = (await db.userAnswer.findMany({
    where: { userId, assessmentQuestionId: { in: assessment.questions.map((q) => q.id) } },
    select: { assessmentQuestionId: true, selectedOptionId: true, isCorrect: true },
  })) as { assessmentQuestionId: string; selectedOptionId: string | null; isCorrect: boolean }[];
  const answerByQuestion = new Map(answers.map((a) => [a.assessmentQuestionId, a]));

  // Tier-ordered skill set reconstructed from AssessmentSkill provenance:
  // USER_SELECTED first, then JD, then JOB_TITLE; id-asc inside each tier
  // (deterministic; the original click order within a tier is not stored and
  // only affects tie-breaking inside equally-sourced skills).
  const tierOf = (sources: string[]) =>
    sources.includes("USER_SELECTED") ? 0 : sources.includes("JD") ? 1 : 2;
  const orderedSkillIds = assessment.skills
    .slice()
    .sort(
      (a, b) =>
        tierOf(a.sources) - tierOf(b.sources) || a.skillId.localeCompare(b.skillId),
    )
    .map((s) => s.skillId);

  const start = asDifficulty(assessment.difficulty, "MEDIUM");
  const rows: CtxRow[] = assessment.questions.map((q) => {
    const answer = answerByQuestion.get(q.id);
    return {
      id: q.id,
      sequence: q.sequence,
      skillId: q.skillId,
      libraryQuestionId: q.libraryQuestionId,
      snapshot: parseSnapshot(q.questionSnapshot),
      answered: Boolean(answer?.selectedOptionId),
      isCorrect: answer?.selectedOptionId ? answer.isCorrect : null,
    };
  });

  return {
    assessmentId: assessment.id,
    userId,
    status: assessment.status,
    flow: assessment.flow,
    jobTitleId: assessment.jobTitleId,
    start,
    count: assessment.requestedQuestionCount,
    areaName: assessment.areaOfInterest.name,
    categoryName: assessment.category.name,
    jobTitleName: assessment.jobTitle?.name ?? null,
    orderedSkillIds,
    rows,
  };
}

function toServedRows(ctx: AdaptiveContext): ServedRow[] {
  return ctx.rows.map((r) => ({
    sequence: r.sequence,
    skillId: r.skillId,
    difficulty: asDifficulty(r.snapshot.difficulty, ctx.start),
    answered: r.answered,
    isCorrect: r.isCorrect,
  }));
}

type ServeOutcome = "served" | "complete" | "exhausted" | "duplicate";

/** Selects + snapshots the next question (Parts F/G/H/I/J/K). */
async function serveNextQuestion(ctx: AdaptiveContext): Promise<ServeOutcome> {
  const db = getPrisma();
  const state = replayState(toServedRows(ctx), ctx.count, ctx.start);
  if (state.servedCount >= ctx.count) return "complete";
  if (!ctx.jobTitleId) return "exhausted";

  const blueprint = buildBlueprint(ctx.count, ctx.orderedSkillIds, ctx.start);
  const order = skillNeedOrder(state, blueprint, ctx.orderedSkillIds);
  const excludeIds = ctx.rows
    .map((r) => r.libraryQuestionId)
    .filter((v): v is string => Boolean(v));

  for (const key of order) {
    for (const difficulty of difficultyTrials(state, blueprint, key)) {
      const candidates = await selectEligibleQuestions({
        userId: ctx.userId,
        flow: ctx.flow,
        difficulty,
        jobTitleId: ctx.jobTitleId,
        skillId: key === NO_SKILL ? undefined : key,
        excludeQuestionIds: excludeIds,
      });
      const next = candidates[0];
      if (!next) continue;
      try {
        await db.$transaction(async (tx: PrismaClient) => {
          await tx.assessmentQuestion.create({
            data: {
              assessmentId: ctx.assessmentId,
              sequence: state.servedCount + 1,
              source: "QUESTION_LIBRARY",
              libraryQuestionId: next.id,
              codingQuestionId: null,
              // A4 attribution: the skill this adaptive pick diagnoses.
              skillId: key === NO_SKILL ? null : key,
              questionSnapshot: buildSnapshot({
                questionText: next.questionText,
                options: next.options,
                difficulty,
              }) as unknown as Record<string, unknown>,
            },
          });
        });
        return "served";
      } catch (e) {
        // A racing request already served this sequence: converge silently.
        if (isP2002(e)) return "duplicate";
        throw e;
      }
    }
  }
  // Controlled insufficient-pool state (Part J/Q) — never fabricate.
  return "exhausted";
}

function buildTakingData(ctx: AdaptiveContext, exhausted: boolean): AdaptiveTakingData {
  const served = ctx.rows.length;
  const answered = ctx.rows.filter((r) => r.answered).length;
  const pending = ctx.rows.find((r) => !r.answered) ?? null;
  return {
    assessmentId: ctx.assessmentId,
    areaName: ctx.areaName,
    categoryName: ctx.categoryName,
    jobTitleName: ctx.jobTitleName,
    startDifficulty: ctx.start,
    count: ctx.count,
    served,
    answered,
    question: pending
      ? {
          id: pending.id,
          sequence: pending.sequence,
          text: pending.snapshot.questionText,
          options: pending.snapshot.options
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((o) => ({ id: o.id, text: o.text })),
        }
      : null,
    exhausted,
    complete: served >= ctx.count && answered >= served,
  };
}

/**
 * Taking payload for an adaptive assessment. Guarantees the invariant "all
 * served questions answered ⇒ one pending question exists (or the pool is
 * exhausted / the assessment is complete)" by serving on read when needed —
 * this is what makes refresh/resume/network-retry converge (Part M).
 */
export async function getAdaptiveTakingData(
  userId: string,
  assessmentId: string,
): Promise<AdaptiveTakingData | null> {
  let ctx = await loadContext(userId, assessmentId);
  if (!ctx || ctx.status !== "IN_PROGRESS") return null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const allAnswered = ctx.rows.every((r) => r.answered);
    if (!allAnswered || ctx.rows.length >= ctx.count) break;
    const outcome = await serveNextQuestion(ctx);
    if (outcome === "duplicate" || outcome === "served") {
      ctx = (await loadContext(userId, assessmentId)) as AdaptiveContext;
      continue;
    }
    return buildTakingData(ctx, outcome === "exhausted");
  }
  return buildTakingData(ctx, false);
}

/**
 * Answers the CURRENT adaptive question and advances — one authoritative
 * server step (Parts D/N/P):
 * - ownership + adaptive + IN_PROGRESS validated in the WHERE clause;
 * - the option is validated against the immutable snapshot;
 * - correctness/score are computed here and never returned to the client;
 * - a duplicate answer (double click / retry / race) is an idempotent no-op
 *   that returns the converged current state WITHOUT advancing twice;
 * - after grading, the next question is selected + snapshotted server-side.
 */
export async function answerAdaptiveQuestion(
  userId: string,
  assessmentQuestionId: string,
  optionId: string,
): Promise<AnswerAdaptiveResult> {
  const db = getPrisma();
  const row = (await db.assessmentQuestion.findFirst({
    where: {
      id: assessmentQuestionId,
      assessment: { userId, adaptiveEnabled: true, status: "IN_PROGRESS" },
    },
    select: {
      id: true,
      sequence: true,
      questionSnapshot: true,
      assessment: { select: { id: true } },
    },
  })) as {
    id: string;
    sequence: number;
    questionSnapshot: unknown;
    assessment: { id: string };
  } | null;
  if (!row) {
    return { ok: false, error: "This question is not part of an open adaptive assessment." };
  }

  const snapshot = parseSnapshot(row.questionSnapshot);
  if (!snapshot.options.some((o) => o.id === optionId)) {
    return { ok: false, error: "That option does not belong to this question." };
  }

  const existing = (await db.userAnswer.findUnique({
    where: { assessmentQuestionId: row.id },
    select: { selectedOptionId: true },
  })) as { selectedOptionId: string | null } | null;
  if (existing?.selectedOptionId) {
    // Already advanced by an earlier (possibly concurrent) request.
    const data = await getAdaptiveTakingData(userId, row.assessment.id);
    if (!data) return { ok: false, error: "This assessment is no longer open." };
    return { ok: true, data };
  }

  const isCorrect = optionId === snapshot.correctOptionId;
  try {
    await db.$transaction(async (tx: PrismaClient) => {
      await tx.userAnswer.create({
        data: {
          assessmentQuestionId: row.id,
          userId,
          selectedOptionId: optionId,
          isCorrect,
          score: isCorrect ? 1 : 0,
        },
      });
    });
  } catch (e) {
    if (!isP2002(e)) throw e;
    // Concurrent duplicate: the other request graded + advanced already.
  }

  const data = await getAdaptiveTakingData(userId, row.assessment.id);
  if (!data) return { ok: false, error: "This assessment is no longer open." };
  // The response carries ONLY the safe projection of the next question —
  // never correctness, difficulty state, skill state or the future set.
  return { ok: true, data };
}
