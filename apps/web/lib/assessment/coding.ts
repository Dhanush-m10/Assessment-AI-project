import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  isCodingSnapshot,
  parseCodingSnapshot,
  toCodingClientView,
  type ClientCodingQuestion,
} from "@/lib/assessment/snapshot";
import { executeTests, type Judge0Failure } from "@/lib/judge0/client";
import { resolveJudge0Language } from "@/lib/judge0/languages";

/**
 * CODING flow runtime (Phase 7): taking payload, Run Code (PUBLIC tests
 * only), per-question Submit (all tests, server-side), and the authoritative
 * final submission (D-SCORE aggregation + A3 history + D-CODE all-or-nothing
 * correctness).
 *
 * Security contract:
 * - Every entry point re-validates ownership (userId + assessment + question)
 *   and lifecycle state in its WHERE clause.
 * - The client sends only code; language, tests, comparison, pass/fail and
 *   scoring are decided exclusively here and in lib/judge0 (server-only).
 * - Hidden test inputs/expected outputs never leave the server: run results
 *   echo only the candidate's own stdout/stderr and safe status labels.
 */

export type CodingTakingData = {
  assessmentId: string;
  areaName: string;
  categoryName: string;
  jobTitleName: string | null;
  difficulty: string;
  questions: (ClientCodingQuestion & {
    saved: {
      code: string | null;
      passedTestCount: number | null;
      totalTestCount: number | null;
      isCorrect: boolean | null;
    };
  })[];
};

/** Taking payload for a CODING assessment; null when not owned/not open. */
export async function getCodingTakingData(
  userId: string,
  assessmentId: string,
): Promise<CodingTakingData | null> {
  const db = getPrisma();
  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId, flow: "CODING", status: "IN_PROGRESS" },
    select: {
      id: true,
      difficulty: true,
      areaOfInterest: { select: { name: true } },
      category: { select: { name: true } },
      jobTitle: { select: { name: true } },
      questions: {
        orderBy: { sequence: "asc" },
        select: { id: true, sequence: true, questionSnapshot: true },
      },
    },
  })) as {
    id: string;
    difficulty: string;
    areaOfInterest: { name: string };
    category: { name: string };
    jobTitle: { name: string } | null;
    questions: { id: string; sequence: number; questionSnapshot: unknown }[];
  } | null;
  if (!assessment) return null;

  const answers = (await db.userAnswer.findMany({
    where: { userId, assessmentQuestionId: { in: assessment.questions.map((q) => q.id) } },
    select: {
      assessmentQuestionId: true,
      submittedCode: true,
      passedTestCount: true,
      totalTestCount: true,
      isCorrect: true,
    },
  })) as {
    assessmentQuestionId: string;
    submittedCode: string | null;
    passedTestCount: number | null;
    totalTestCount: number | null;
    isCorrect: boolean;
  }[];
  const answerByQuestion = new Map(answers.map((a) => [a.assessmentQuestionId, a]));

  return {
    assessmentId: assessment.id,
    areaName: assessment.areaOfInterest.name,
    categoryName: assessment.category.name,
    jobTitleName: assessment.jobTitle?.name ?? null,
    difficulty: assessment.difficulty,
    questions: assessment.questions.map((q) => {
      if (!isCodingSnapshot(q.questionSnapshot)) {
        throw new Error("Coding assessment contains a non-coding question.");
      }
      const saved = answerByQuestion.get(q.id);
      return {
        ...toCodingClientView(q.id, q.sequence, parseCodingSnapshot(q.questionSnapshot)),
        saved: {
          code: saved?.submittedCode ?? null,
          passedTestCount: saved?.passedTestCount ?? null,
          totalTestCount: saved?.totalTestCount ?? null,
          isCorrect: saved ? saved.isCorrect : null,
        },
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Execution (Run Code / Submit Code)
// ---------------------------------------------------------------------------

export type TestRunView = {
  index: number;
  passed: boolean;
  statusLabel: string;
  stdout: string | null;
  stderr: string | null;
};

export type RunCodeResult =
  | { ok: true; results: TestRunView[] }
  | { ok: false; error: string };

export type SubmitCodeResult =
  | { ok: true; passed: number; total: number; correct: boolean }
  | { ok: false; error: string };

const FAILURE_MESSAGES: Record<Judge0Failure, string> = {
  "not-configured":
    "Code execution is not configured on the server yet. Please contact the administrator.",
  "unsupported-language":
    "This question's language is not supported by the code execution service.",
  "code-too-large": "Your code is too large to execute. Please shorten it.",
  unavailable: "The code execution service is unavailable right now. Please try again shortly.",
  timeout: "The code execution service timed out. Please try again shortly.",
  "malformed-response":
    "The code execution service returned an unexpected response. Please try again.",
};

const MAX_CODE_CHARS = 100_000;

async function loadOwnedCodingQuestion(userId: string, assessmentQuestionId: string) {
  const row = (await getPrisma().assessmentQuestion.findFirst({
    where: {
      id: assessmentQuestionId,
      assessment: { userId, status: "IN_PROGRESS", flow: "CODING" },
    },
    select: { id: true, questionSnapshot: true, codingQuestionId: true },
  })) as { id: string; questionSnapshot: unknown; codingQuestionId: string | null } | null;
  if (!row || !isCodingSnapshot(row.questionSnapshot)) return null;
  return { row, snapshot: parseCodingSnapshot(row.questionSnapshot) };
}

function validateCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  if (code.trim().length === 0) return null;
  if (code.length > MAX_CODE_CHARS) return null;
  return code;
}

/**
 * Run Code: executes PUBLIC sample tests only (D-CODE / spec §24). Hidden
 * tests are never touched here, and only the candidate's own output plus a
 * safe status label is returned.
 */
export async function runCodingCode(
  userId: string,
  assessmentQuestionId: string,
  rawCode: unknown,
): Promise<RunCodeResult> {
  const owned = await loadOwnedCodingQuestion(userId, assessmentQuestionId);
  if (!owned) return { ok: false, error: "This question is not part of an open assessment." };

  const code = validateCode(rawCode);
  if (!code) return { ok: false, error: "Write some code before running it." };

  const publicTests = owned.snapshot.testCases.filter((t) => t.visibility === "PUBLIC");
  if (publicTests.length === 0) {
    return { ok: false, error: "This question has no sample tests to run against." };
  }

  const run = await executeTests(
    owned.snapshot.language,
    code,
    publicTests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput })),
  );
  if (!run.ok) return { ok: false, error: FAILURE_MESSAGES[run.reason] };

  return {
    ok: true,
    results: run.results.map((r, i) => ({
      index: i + 1,
      passed: r.passed,
      statusLabel: r.passed ? "Passed" : r.statusLabel,
      stdout: r.stdout,
      stderr: r.stderr,
    })),
  };
}

/**
 * Submit Code (per question): executes ALL tests server-side, decides
 * correctness with D-CODE all-or-nothing (100% of hidden tests; if a question
 * has no hidden tests, 100% of all tests), and persists the attempt
 * (UserAnswer upsert — double-submit safe via @@unique).
 */
export async function submitCodingQuestion(
  userId: string,
  assessmentQuestionId: string,
  rawCode: unknown,
): Promise<SubmitCodeResult> {
  const db = getPrisma();
  const owned = await loadOwnedCodingQuestion(userId, assessmentQuestionId);
  if (!owned) return { ok: false, error: "This question is not part of an open assessment." };

  const code = validateCode(rawCode);
  if (!code) return { ok: false, error: "Write some code before submitting." };

  // Fail fast with a controlled error for unmapped languages (never silently
  // substitute another language).
  if (!resolveJudge0Language(owned.snapshot.language)) {
    return { ok: false, error: FAILURE_MESSAGES["unsupported-language"] };
  }

  const tests = owned.snapshot.testCases;
  const run = await executeTests(
    owned.snapshot.language,
    code,
    tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput })),
  );
  if (!run.ok) return { ok: false, error: FAILURE_MESSAGES[run.reason] };

  const hiddenIdx = tests
    .map((t, i) => (t.visibility === "HIDDEN" ? i : -1))
    .filter((i) => i >= 0);
  const gradedIdx = hiddenIdx.length > 0 ? hiddenIdx : tests.map((_, i) => i);
  const correct = gradedIdx.every((i) => run.results[i]?.passed === true);
  const passed = run.results.filter((r) => r.passed).length;

  await db.userAnswer.upsert({
    where: { assessmentQuestionId: owned.row.id },
    create: {
      assessmentQuestionId: owned.row.id,
      userId,
      submittedCode: code,
      passedTestCount: passed,
      totalTestCount: tests.length,
      isCorrect: correct,
      score: correct ? 1 : 0,
    },
    update: {
      submittedCode: code,
      passedTestCount: passed,
      totalTestCount: tests.length,
      isCorrect: correct,
      score: correct ? 1 : 0,
      submittedAt: new Date(),
    },
  });

  return { ok: true, passed, total: tests.length, correct };
}

// ---------------------------------------------------------------------------
// Final submission
// ---------------------------------------------------------------------------

export type CodingSubmitResult =
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
 * Authoritative final submission for CODING (mirrors submitMcqAssessment,
 * D-SCORE: 1 point per correct challenge). Per-question correctness was fixed
 * server-side at Submit Code time; this transaction aggregates scores, feeds
 * the A3 30-day history (codingQuestionId side) and completes the assessment.
 *
 * F4: the transaction writes are batched by group (same constant statement
 * count for any N) with unchanged semantics: correct -> lastAnsweredAt AND
 * lastCorrectAt = now; incorrect -> lastAnsweredAt = now only (a previous
 * lastCorrectAt is never cleared).
 *
 * Double submit is idempotent and exactly-once: the final update is
 * conditioned on status = IN_PROGRESS, so a concurrent double-submit cannot
 * overwrite the final state; the losing request rolls back and reports
 * already-completed.
 */
export async function submitCodingAssessment(
  userId: string,
  assessmentId: string,
): Promise<CodingSubmitResult> {
  const db = getPrisma();

  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId, flow: "CODING" },
    select: { id: true, status: true },
  })) as { id: string; status: string } | null;
  if (!assessment) return { ok: false, reason: "not-found" };
  if (assessment.status === "COMPLETED") {
    return { ok: false, reason: "already-completed", assessmentId: assessment.id };
  }
  if (assessment.status !== "IN_PROGRESS") return { ok: false, reason: "not-open" };

  const questions = (await db.assessmentQuestion.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true, codingQuestionId: true },
  })) as { id: string; codingQuestionId: string | null }[];

  const answers = (await db.userAnswer.findMany({
    where: { userId, assessmentQuestionId: { in: questions.map((q) => q.id) } },
    select: {
      id: true,
      assessmentQuestionId: true,
      submittedCode: true,
      isCorrect: true,
      score: true,
    },
  })) as {
    id: string;
    assessmentQuestionId: string;
    submittedCode: string | null;
    isCorrect: boolean;
    score: number;
  }[];
  const answerByQuestion = new Map(answers.map((a) => [a.assessmentQuestionId, a]));

  const unanswered = questions.filter((q) => !answerByQuestion.get(q.id)?.submittedCode);
  if (unanswered.length > 0) {
    return { ok: false, reason: "unanswered", missing: unanswered.length };
  }

  const now = new Date();
  const scored = questions.map((q) => {
    const answer = answerByQuestion.get(q.id)!;
    return { question: q, answer, correct: answer.isCorrect };
  });
  const correctCount = scored.filter((s) => s.correct).length;
  const percentage = (correctCount / questions.length) * 100;

  // F4 batching (mirrors submitMcqAssessment): group the per-question writes
  // by identical data so any challenge count costs the same constant number
  // of statements, all inside one interactive transaction.
  const correctAnswerIds: string[] = [];
  const incorrectAnswerIds: string[] = [];
  const historyEntries: { codingQuestionId: string; correct: boolean }[] = [];
  for (const s of scored) {
    (s.correct ? correctAnswerIds : incorrectAnswerIds).push(s.answer.id);
    if (s.question.codingQuestionId) {
      historyEntries.push({ codingQuestionId: s.question.codingQuestionId, correct: s.correct });
    }
  }

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Existing history rows must be read INSIDE the transaction to
      // preserve the race-safety of the previous per-question upserts.
      const existing: { codingQuestionId: string | null }[] =
        historyEntries.length > 0
          ? await tx.userQuestionHistory.findMany({
              where: { userId, codingQuestionId: { in: historyEntries.map((e) => e.codingQuestionId) } },
              select: { codingQuestionId: true },
            })
          : [];
      const existingIds = new Set(existing.map((h) => h.codingQuestionId as string));

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

      // New history rows (deduped). skipDuplicates keeps double-submit
      // safety if a concurrent finalization inserted the same row first.
      const seenCreate = new Set<string>();
      const toCreate = historyEntries.filter((e) => {
        if (existingIds.has(e.codingQuestionId) || seenCreate.has(e.codingQuestionId)) return false;
        seenCreate.add(e.codingQuestionId);
        return true;
      });
      if (toCreate.length > 0) {
        await tx.userQuestionHistory.createMany({
          data: toCreate.map((e) => ({
            userId,
            codingQuestionId: e.codingQuestionId,
            lastAnsweredAt: now,
            lastCorrectAt: e.correct ? now : null,
          })),
          skipDuplicates: true,
        });
      }

      // Existing rows answered correctly NOW: advance both timestamps.
      const existingCorrect = historyEntries
        .filter((e) => e.correct && existingIds.has(e.codingQuestionId))
        .map((e) => e.codingQuestionId);
      if (existingCorrect.length > 0) {
        await tx.userQuestionHistory.updateMany({
          where: { userId, codingQuestionId: { in: existingCorrect } },
          data: { lastAnsweredAt: now, lastCorrectAt: now },
        });
      }
      // Existing rows answered incorrectly NOW: touch lastAnsweredAt only —
      // a previous lastCorrectAt is deliberately preserved (30-day window).
      const existingIncorrect = historyEntries
        .filter((e) => !e.correct && existingIds.has(e.codingQuestionId))
        .map((e) => e.codingQuestionId);
      if (existingIncorrect.length > 0) {
        await tx.userQuestionHistory.updateMany({
          where: { userId, codingQuestionId: { in: existingIncorrect } },
          data: { lastAnsweredAt: now },
        });
      }

      // Exactly-once finalization (see submitMcqAssessment).
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
