import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { buildSnapshot, parseSnapshot, type QuestionSnapshot } from "@/lib/assessment/snapshot";

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

export async function selectEligibleQuestions(args: {
  userId: string;
  areaId: string;
  difficulty: DifficultyValue;
}): Promise<EligibleQuestion[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = (await getPrisma().question.findMany({
    where: {
      status: "LIVE",
      assessmentFlow: "GENERAL",
      difficulty: args.difficulty,
      areas: { some: { areaOfInterestId: args.areaId } },
      // D-30DAY hard rule.
      NOT: {
        history: {
          some: { userId: args.userId, lastCorrectAt: { gte: thirtyDaysAgo } },
        },
      },
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      questionText: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, text: true, isCorrect: true },
      },
    },
  })) as EligibleQuestion[];
  return rows;
}

export type CreateResult =
  | { ok: true; assessmentId: string }
  | { ok: false; reason: "insufficient"; available: number }
  | { ok: false; reason: "invalid-area" };

/**
 * Creates the Assessment + AssessmentQuestion snapshots in ONE transaction.
 * Idempotent via clientRequestId (spec §43): a replayed request returns the
 * originally created assessment instead of a duplicate row.
 */
export async function createGeneralAssessment(args: {
  userId: string;
  areaId: string;
  difficulty: DifficultyValue;
  count: number;
  clientRequestId: string;
}): Promise<CreateResult> {
  const db = getPrisma();

  // Replay check first (unique index would also catch it inside the tx).
  const existing = (await db.assessment.findUnique({
    where: { clientRequestId: args.clientRequestId },
    select: { id: true, userId: true },
  })) as { id: string; userId: string } | null;
  if (existing) {
    return existing.userId === args.userId
      ? { ok: true, assessmentId: existing.id }
      : { ok: false, reason: "invalid-area" }; // key collision across users: treat as bad request
  }

  const area = (await db.areaOfInterest.findFirst({
    where: { id: args.areaId, status: "LIVE", classification: "GENERAL" },
    select: { id: true, categoryId: true },
  })) as { id: string; categoryId: string } | null;
  if (!area) return { ok: false, reason: "invalid-area" };

  const eligible = await selectEligibleQuestions({
    userId: args.userId,
    areaId: area.id,
    difficulty: args.difficulty,
  });
  if (eligible.length < args.count) {
    return { ok: false, reason: "insufficient", available: eligible.length };
  }
  const selected = eligible.slice(0, args.count);

  const created = (await db.$transaction(async (tx: PrismaClient) => {
    const assessment = await tx.assessment.create({
      data: {
        userId: args.userId,
        flow: "GENERAL",
        mode: null,
        categoryId: area.categoryId,
        areaOfInterestId: area.id,
        jobTitleId: null,
        difficulty: args.difficulty,
        experienceBand: null,
        requestedQuestionCount: args.count,
        previewEnabled: false,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        clientRequestId: args.clientRequestId,
      },
      select: { id: true },
    });
    await tx.assessmentQuestion.createMany({
      data: selected.map((q, i) => ({
        assessmentId: assessment.id,
        sequence: i + 1,
        source: "QUESTION_LIBRARY",
        libraryQuestionId: q.id,
        codingQuestionId: null,
        skillId: null,
        questionSnapshot: buildSnapshot({
          questionText: q.questionText,
          options: q.options,
        }) as unknown as Record<string, unknown>,
      })),
    });
    return assessment;
  })) as { id: string };

  return { ok: true, assessmentId: created.id };
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
    where: { id: assessmentId, userId },
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
      assessment: { userId: args.userId, status: "IN_PROGRESS" },
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
 * Authoritative submission + scoring (D-SCORE: 1 point per correct MCQ).
 * Everything is recomputed from snapshots in a single transaction:
 * answers -> correctness -> UserAnswer scores -> UserQuestionHistory
 * (30-day rule feed) -> Assessment finalScore/finalPercentage/COMPLETED.
 * Double submit is idempotent: a COMPLETED assessment returns its result.
 */
export async function submitGeneralAssessment(
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

  await db.$transaction(async (tx: PrismaClient) => {
    for (const s of scored) {
      await tx.userAnswer.update({
        where: { id: s.answer.id },
        data: { isCorrect: s.correct, score: s.correct ? 1 : 0 },
      });
      if (s.question.libraryQuestionId) {
        await tx.userQuestionHistory.upsert({
          where: {
            userId_questionId: { userId, questionId: s.question.libraryQuestionId },
          },
          create: {
            userId,
            questionId: s.question.libraryQuestionId,
            lastAnsweredAt: now,
            lastCorrectAt: s.correct ? now : null,
          },
          update: {
            lastAnsweredAt: now,
            ...(s.correct ? { lastCorrectAt: now } : {}),
          },
        });
      }
    }
    await tx.assessment.update({
      where: { id: assessment.id },
      data: {
        status: "COMPLETED",
        finalScore: correctCount,
        finalPercentage: percentage,
        completedAt: now,
      },
    });
  });

  return { ok: true, assessmentId: assessment.id, correct: correctCount, total: questions.length };
}
