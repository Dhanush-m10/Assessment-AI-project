import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { parseSnapshot, type QuestionSnapshot } from "@/lib/assessment/snapshot";
import {
  selectEligibleQuestions as selectEngineQuestions,
  createAssessment as createEngineAssessment,
} from "@/lib/assessment/engine";

/**
 * GENERAL assessment engine (Phase 4 vertical slice).
 *
 * Selection rules (approved decisions only):
 * - LIVE questions of flow GENERAL at the requested difficulty, linked to the
 *   selected area through QuestionArea (spec §50 index shape).
 * - D-30DAY: questions this user answered CORRECTLY within 30 days are
 *   excluded (one indexed range scan on UserQuestionHistory(userId,
 *   lastCorrectAt)). Wrongly answered questions stay eligible.
 * - D-GENSKILL / A4: no skill quotas for GENERAL; AssessmentQuestion.skillId
 *   stays null.
 * - Deterministic order (id asc) so selections are debuggable/reproducible.
 * - Insufficient pool => controlled failure state; NEVER fewer questions and
 *   NEVER fabricated ones (AI gap-fill arrives with the AI phase).
 */

import { GENERAL_COUNT_MIN, GENERAL_COUNT_MAX, DIFFICULTIES, type DifficultyValue } from "@/lib/assessment/limits";
export type { DifficultyValue } from "@/lib/assessment/limits";

export function parseDifficulty(value: string): DifficultyValue | null {
  return (DIFFICULTIES as readonly string[]).includes(value)
    ? (value as DifficultyValue)
    : null;
}

export function parseCount(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= GENERAL_COUNT_MIN && n <= GENERAL_COUNT_MAX ? n : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseClientRequestId(value: string): string | null {
  return UUID_RE.test(value) ? value : null;
}

type EligibleQuestion = {
  id: string;
  questionText: string;
  options: { id: string; position: number; text: string; isCorrect: boolean }[];
};

/** GENERAL selection = shared engine with a GENERAL/area context. */
export async function selectEligibleQuestions(args: {
  userId: string;
  areaId: string;
  difficulty: DifficultyValue;
}): Promise<EligibleQuestion[]> {
  const rows = await selectEngineQuestions({
    userId: args.userId,
    flow: "GENERAL",
    difficulty: args.difficulty,
    areaId: args.areaId,
  });
  return rows.map((r) => ({ id: r.id, questionText: r.questionText, options: r.options }));
}

export type CreateResult =
  | { ok: true; assessmentId: string; status: "PREVIEW" | "IN_PROGRESS" }
  | { ok: false; reason: "insufficient"; available: number }
  | { ok: false; reason: "invalid-area" };

/**
 * Creates the Assessment + AssessmentQuestion snapshots via the shared engine
 * (single transaction, clientRequestId idempotency, preview ON/OFF statuses).
 *
 * `validatedArea` (optional): the area was already re-validated server-side
 * in this same request by the caller (see engine.AssessmentDraft.validatedArea);
 * when provided, the area is not queried again here or in the engine.
 */
export async function createGeneralAssessment(args: {
  userId: string;
  areaId: string;
  difficulty: DifficultyValue;
  count: number;
  clientRequestId: string;
  previewEnabled?: boolean;
  validatedArea?: { id: string; categoryId: string };
}): Promise<CreateResult> {
  const area: { id: string; categoryId: string } | null =
    args.validatedArea ??
    ((await getPrisma().areaOfInterest.findFirst({
      where: { id: args.areaId, status: "LIVE", classification: "GENERAL" },
      select: { id: true, categoryId: true },
    })) as { id: string; categoryId: string } | null);
  if (!area) return { ok: false, reason: "invalid-area" };

  const result = await createEngineAssessment({
    userId: args.userId,
    clientRequestId: args.clientRequestId,
    flow: "GENERAL",
    categoryId: area.categoryId,
    areaId: area.id,
    jobTitleId: null,
    difficulty: args.difficulty,
    experienceBand: null,
    count: args.count,
    previewEnabled: args.previewEnabled ?? false,
    jd: null,
    selection: {
      userId: args.userId,
      flow: "GENERAL",
      difficulty: args.difficulty,
      areaId: area.id,
    },
    validatedArea: args.validatedArea,
  });
  if (!result.ok) return result;
  return { ok: true, assessmentId: result.assessmentId, status: result.status };
}

export type TakingData = {
  assessmentId: string;
  areaName: string;
  categoryName: string;
  difficulty: string;
  questions: { id: string; sequence: number; text: string; options: { id: string; text: string }[] }[];
  answers: Record<string, string>;
};

/** Server-side taking payload: snapshots projected to display-safe views. */
export async function getTakingData(
  userId: string,
  assessmentId: string,
): Promise<TakingData | null> {
  const db = getPrisma();
  const assessment = (await db.assessment.findFirst({
    // Adaptive assessments are served one question at a time by
    // lib/assessment/adaptive.ts — the full-set standard screen never applies.
    where: { id: assessmentId, userId, adaptiveEnabled: false },
    select: {
      id: true,
      status: true,
      difficulty: true,
      areaOfInterest: { select: { name: true } },
      category: { select: { name: true } },
      questions: {
        orderBy: { sequence: "asc" },
        select: { id: true, sequence: true, questionSnapshot: true },
      },
    },
  })) as {
    id: string;
    status: string;
    difficulty: string;
    areaOfInterest: { name: string };
    category: { name: string };
    questions: { id: string; sequence: number; questionSnapshot: unknown }[];
  } | null;
  if (!assessment || assessment.status !== "IN_PROGRESS") return null;

  const answers = (await db.userAnswer.findMany({
    where: { userId, assessmentQuestionId: { in: assessment.questions.map((q) => q.id) } },
    select: { assessmentQuestionId: true, selectedOptionId: true },
  })) as { assessmentQuestionId: string; selectedOptionId: string | null }[];

  return {
    assessmentId: assessment.id,
    areaName: assessment.areaOfInterest.name,
    categoryName: assessment.category.name,
    difficulty: assessment.difficulty,
    questions: assessment.questions.map((q) => {
      const snap = parseSnapshot(q.questionSnapshot);
      return {
        id: q.id,
        sequence: q.sequence,
        text: snap.questionText,
        options: snap.options
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((o) => ({ id: o.id, text: o.text })),
      };
    }),
    answers: Object.fromEntries(
      answers.filter((a) => a.selectedOptionId).map((a) => [a.assessmentQuestionId, a.selectedOptionId as string]),
    ),
  };
}

/**
 * Persists one answer selection. Validates the full ownership chain and that
 * the option belongs to THIS question's immutable snapshot (library edits can
 * never mutate an in-flight assessment).
 */
export async function saveAnswer(args: {
  userId: string;
  assessmentQuestionId: string;
  optionId: string;
}): Promise<{ ok: boolean; reason?: "not-found" | "invalid-option" | "not-open" }> {
  const db = getPrisma();
  const row = (await db.assessmentQuestion.findFirst({
    where: {
      id: args.assessmentQuestionId,
      // Standard save path only; adaptive answers grade + advance via
      // answerAdaptiveQuestion (concurrency-safe, server-authoritative).
      assessment: { userId: args.userId, status: "IN_PROGRESS", adaptiveEnabled: false },
    },
    select: { id: true, questionSnapshot: true },
  })) as { id: string; questionSnapshot: unknown } | null;
  if (!row) return { ok: false, reason: "not-found" };

  const snap = parseSnapshot(row.questionSnapshot);
  if (!snap.options.some((o) => o.id === args.optionId)) {
    return { ok: false, reason: "invalid-option" };
  }

  await db.userAnswer.upsert({
    where: { assessmentQuestionId: row.id },
    create: {
      assessmentQuestionId: row.id,
      userId: args.userId,
      selectedOptionId: args.optionId,
      isCorrect: false,
      score: 0,
    },
    update: { selectedOptionId: args.optionId },
  });
  return { ok: true };
}

export type SubmitResult =
  | { ok: true; assessmentId: string; correct: number; total: number }
  | { ok: false; reason: "not-found" | "not-open" | "unanswered"; missing?: number }
  | { ok: false; reason: "already-completed"; assessmentId: string };

/**
 * Internal marker (never surfaces to callers): the conditional finalization
 * matched 0 rows because a concurrent submission completed the assessment
 * first. Thrown inside the interactive transaction so the whole tx rolls
 * back, then mapped to the existing already-completed/not-open results.
 */
class FinalizedElsewhereError extends Error {}

/**
 * Authoritative submission + scoring (D-SCORE: 1 point per correct MCQ).
 * Flow-agnostic: works for GENERAL and BASIC_MCQ (any snapshot-backed MCQ).
 * Everything is recomputed from snapshots in a single transaction:
 * answers -> correctness -> UserAnswer scores -> UserQuestionHistory
 * (30-day rule feed) -> Assessment finalScore/finalPercentage/COMPLETED.
 *
 * F4: the transaction writes are batched by group (2x UserAnswer.updateMany,
 * 1x history findMany + 1x createMany + up to 2x history updateMany, 1x
 * assessment finalization) instead of 2N+1 per-question statements, so any
 * assessment size costs the same constant number of statements. Semantics
 * are unchanged (see history rules below).
 *
 * Finalization is exactly-once: the final update is conditioned on
 * status = IN_PROGRESS, so a concurrent double-submit cannot overwrite the
 * final state; the losing request rolls back and reports already-completed.
 * A serial re-submit of a COMPLETED assessment is answered by the status
 * gate above (zero writes).
 *
 * History semantics (unchanged): correct -> lastAnsweredAt = now AND
 * lastCorrectAt = now; incorrect -> lastAnsweredAt = now only (a previous
 * lastCorrectAt is never cleared, preserving the 30-day exclusion window).
 */
export async function submitMcqAssessment(
  userId: string,
  assessmentId: string,
): Promise<SubmitResult> {
  const db = getPrisma();

  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId },
    select: { id: true, status: true },
  })) as { id: string; status: string } | null;
  if (!assessment) return { ok: false, reason: "not-found" };
  if (assessment.status === "COMPLETED") {
    return { ok: false, reason: "already-completed", assessmentId: assessment.id };
  }
  if (assessment.status !== "IN_PROGRESS") return { ok: false, reason: "not-open" };

  const questions = (await db.assessmentQuestion.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, libraryQuestionId: true, questionSnapshot: true },
  })) as { id: string; libraryQuestionId: string | null; questionSnapshot: unknown }[];

  const answers = (await db.userAnswer.findMany({
    where: { userId, assessmentQuestionId: { in: questions.map((q) => q.id) } },
    select: { id: true, assessmentQuestionId: true, selectedOptionId: true },
  })) as { id: string; assessmentQuestionId: string; selectedOptionId: string | null }[];
  const answerByQuestion = new Map(answers.map((a) => [a.assessmentQuestionId, a]));

  const unanswered = questions.filter((q) => !answerByQuestion.get(q.id)?.selectedOptionId);
  if (unanswered.length > 0) {
    return { ok: false, reason: "unanswered", missing: unanswered.length };
  }

  const now = new Date();
  const scored = questions.map((q) => {
    const snap: QuestionSnapshot = parseSnapshot(q.questionSnapshot);
    const selected = answerByQuestion.get(q.id)?.selectedOptionId as string;
    const correct = selected === snap.correctOptionId;
    return { question: q, answer: answerByQuestion.get(q.id) as { id: string }, correct };
  });
  const correctCount = scored.filter((s) => s.correct).length;
  const percentage = (correctCount / questions.length) * 100;

  // F4 batching: group the per-question writes by identical data. Every
  // answer in a group receives the exact same update, so group-level
  // updateMany statements are order-free and keep the same atomicity as the
  // previous per-question loop (all in one interactive transaction).
  const correctAnswerIds: string[] = [];
  const incorrectAnswerIds: string[] = [];
  const historyEntries: { questionId: string; correct: boolean }[] = [];
  for (const s of scored) {
    (s.correct ? correctAnswerIds : incorrectAnswerIds).push(s.answer.id);
    if (s.question.libraryQuestionId) {
      historyEntries.push({ questionId: s.question.libraryQuestionId, correct: s.correct });
    }
  }

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Existing history rows must be read INSIDE the transaction: it
      // preserves the race-safety of the previous per-question upserts
      // (create vs update decided against committed state at tx time).
      const existing: { questionId: string | null }[] =
        historyEntries.length > 0
          ? await tx.userQuestionHistory.findMany({
              where: { userId, questionId: { in: historyEntries.map((e) => e.questionId) } },
              select: { questionId: true },
            })
          : [];
      const existingIds = new Set(existing.map((h) => h.questionId as string));

      if (correctAnswerIds.length > 0) {
        await tx.userAnswer.updateMany({
          where: { id: { in: correctAnswerIds } },
          data: { isCorrect: true, score: 1 },
        });
      }
      if (incorrectAnswerIds.length > 0) {
        await tx.userAnswer.updateMany({
          where: { id: { in: incorrectAnswerIds } },
          data: { isCorrect: false, score: 0 },
        });
      }

      // New history rows (deduped in case two assessment questions share a
      // library question). skipDuplicates keeps double-submit safety: if a
      // concurrent finalization inserted the same row first, skip it instead
      // of failing the transaction.
      const seenCreate = new Set<string>();
      const toCreate = historyEntries.filter((e) => {
        if (existingIds.has(e.questionId) || seenCreate.has(e.questionId)) return false;
        seenCreate.add(e.questionId);
        return true;
      });
      if (toCreate.length > 0) {
        await tx.userQuestionHistory.createMany({
          data: toCreate.map((e) => ({
            userId,
            questionId: e.questionId,
            lastAnsweredAt: now,
            lastCorrectAt: e.correct ? now : null,
          })),
          skipDuplicates: true,
        });
      }

      // Existing rows answered correctly NOW: advance both timestamps.
      const existingCorrect = historyEntries
        .filter((e) => e.correct && existingIds.has(e.questionId))
        .map((e) => e.questionId);
      if (existingCorrect.length > 0) {
        await tx.userQuestionHistory.updateMany({
          where: { userId, questionId: { in: existingCorrect } },
          data: { lastAnsweredAt: now, lastCorrectAt: now },
        });
      }
      // Existing rows answered incorrectly NOW: touch lastAnsweredAt only —
      // a previous lastCorrectAt is deliberately preserved (30-day window).
      const existingIncorrect = historyEntries
        .filter((e) => !e.correct && existingIds.has(e.questionId))
        .map((e) => e.questionId);
      if (existingIncorrect.length > 0) {
        await tx.userQuestionHistory.updateMany({
          where: { userId, questionId: { in: existingIncorrect } },
          data: { lastAnsweredAt: now },
        });
      }

      // Exactly-once finalization: only an IN_PROGRESS assessment is
      // completed, so a concurrent double-submit sees 0 matching rows.
      const finalized = await tx.assessment.updateMany({
        where: { id: assessment.id, status: "IN_PROGRESS" },
        data: {
          status: "COMPLETED",
          finalScore: correctCount,
          finalPercentage: percentage,
          completedAt: now,
        },
      });
      if (finalized.count !== 1) throw new FinalizedElsewhereError();
    });
  } catch (e) {
    if (e instanceof FinalizedElsewhereError) {
      // A concurrent submission won the race; our writes rolled back with
      // the transaction, so the winner's final state is untouched.
      const current = (await db.assessment.findFirst({
        where: { id: assessmentId, userId },
        select: { status: true },
      })) as { status: string } | null;
      if (current?.status === "COMPLETED") {
        return { ok: false, reason: "already-completed", assessmentId: assessment.id };
      }
      return { ok: false, reason: "not-open" };
    }
    throw e;
  }

  return { ok: true, assessmentId: assessment.id, correct: correctCount, total: questions.length };
}
