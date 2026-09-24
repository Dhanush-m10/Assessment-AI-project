import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { buildSnapshot, parseSnapshot, type QuestionSnapshot } from "@/lib/assessment/snapshot";
import type { DifficultyValue } from "@/lib/assessment/limits";

/**
 * Shared MCQ assessment engine (Phase 5).
 *
 * One implementation of selection / creation / replacement / preview serves
 * GENERAL and BASIC_MCQ today and is shaped so BASIC_SKILLS_MCQ and CODING can
 * plug in later (selection context + source enum are the extension points).
 *
 * Selection rules (approved decisions only):
 * - LIVE questions of the requested flow + difficulty, linked through the
 *   approved taxonomy relations (QuestionArea for GENERAL, QuestionJobTitle
 *   for job-title flows).
 * - D-30DAY hard rule: questions correctly answered by this user within the
 *   last 30 days are excluded (indexed UserQuestionHistory scan).
 * - Replacement candidate rule: only questions NEVER attempted by this user
 *   or previously answered INCORRECTLY (any correctly-answered question is
 *   excluded regardless of age), on top of the 30-day rule.
 * - Preferred-skill tiering: when a JD provides skills, questions tagged with
 *   those skills sort first (deterministic id-asc inside each tier). No skill
 *   quotas here - round-robin quotas belong to the skills flow (D-DIST).
 * - Insufficient pool => controlled state. Never fewer questions, never
 *   fabricated ones; AI gap-fill is a later phase.
 */

export type SelectionContext = {
  userId: string;
  flow: "GENERAL" | "BASIC_MCQ";
  difficulty: DifficultyValue;
  areaId?: string;
  jobTitleId?: string;
  preferredSkillIds?: string[];
  /** Replacement candidate rule (never attempted / previously incorrect). */
  forReplacement?: boolean;
  excludeQuestionIds?: string[];
};

export type EligibleQuestion = {
  id: string;
  questionText: string;
  options: { id: string; position: number; text: string; isCorrect: boolean }[];
  skillIds: string[];
};

export async function selectEligibleQuestions(
  ctx: SelectionContext,
): Promise<EligibleQuestion[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = (await getPrisma().question.findMany({
    where: {
      status: "LIVE",
      assessmentFlow: ctx.flow,
      difficulty: ctx.difficulty,
      ...(ctx.flow === "GENERAL"
        ? { areas: { some: { areaOfInterestId: ctx.areaId } } }
        : { jobTitles: { some: { jobTitleId: ctx.jobTitleId } } }),
      ...(ctx.excludeQuestionIds?.length
        ? { id: { notIn: ctx.excludeQuestionIds } }
        : {}),
      // D-30DAY hard rule.
      NOT: {
        history: { some: { userId: ctx.userId, lastCorrectAt: { gte: thirtyDaysAgo } } },
      },
      // Replacement candidates: never correctly answered at any time.
      ...(ctx.forReplacement
        ? {
            NOT: {
              history: { some: { userId: ctx.userId, lastCorrectAt: { not: null } } },
            },
          }
        : {}),
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      questionText: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, text: true, isCorrect: true },
      },
      skills: { select: { skillId: true } },
    },
  })) as (Omit<EligibleQuestion, "skillIds"> & { skills: { skillId: string }[] })[];

  const shaped = rows.map((r) => ({
    id: r.id,
    questionText: r.questionText,
    options: r.options,
    skillIds: r.skills.map((s) => s.skillId),
  }));

  const preferred = new Set(ctx.preferredSkillIds ?? []);
  if (preferred.size === 0) return shaped;
  // Stable two-tier order: JD-skill-tagged first, then the rest; id-asc inside.
  return shaped.sort((a, b) => {
    const at = a.skillIds.some((s) => preferred.has(s)) ? 0 : 1;
    const bt = b.skillIds.some((s) => preferred.has(s)) ? 0 : 1;
    return at - bt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}

export type AssessmentDraft = {
  userId: string;
  clientRequestId: string;
  flow: "GENERAL" | "BASIC_MCQ";
  categoryId: string;
  areaId: string;
  jobTitleId: string | null;
  difficulty: DifficultyValue;
  experienceBand: string | null;
  count: number;
  previewEnabled: boolean;
  jd: { jdId: string | null; jdSource: "LIBRARY" | "USER_PASTED"; content: string } | null;
  selection: SelectionContext;
};

export type CreateResult =
  | { ok: true; assessmentId: string; status: "PREVIEW" | "IN_PROGRESS" }
  | { ok: false; reason: "insufficient"; available: number }
  | { ok: false; reason: "invalid-area" };

/**
 * Creates Assessment + immutable AssessmentQuestion snapshots in ONE
 * transaction. Idempotent via clientRequestId (unique index): replays return
 * the originally created assessment. Preview ON starts in PREVIEW (questions
 * visible, replaceable, not started); Preview OFF starts IN_PROGRESS.
 */
export async function createAssessment(args: AssessmentDraft): Promise<CreateResult> {
  const db = getPrisma();

  const existing = (await db.assessment.findUnique({
    where: { clientRequestId: args.clientRequestId },
    select: { id: true, userId: true, status: true },
  })) as { id: string; userId: string; status: string } | null;
  if (existing) {
    if (existing.userId !== args.userId) return { ok: false, reason: "invalid-area" };
    return {
      ok: true,
      assessmentId: existing.id,
      status: existing.status === "PREVIEW" ? "PREVIEW" : "IN_PROGRESS",
    };
  }

  const area = (await db.areaOfInterest.findFirst({
    where: { id: args.areaId, status: "LIVE" },
    select: { id: true },
  })) as { id: string } | null;
  if (!area) return { ok: false, reason: "invalid-area" };

  const eligible = await selectEligibleQuestions(args.selection);
  if (eligible.length < args.count) {
    return { ok: false, reason: "insufficient", available: eligible.length };
  }
  const selected = eligible.slice(0, args.count);
  const initialStatus = args.previewEnabled ? "PREVIEW" : "IN_PROGRESS";

  const created = (await db.$transaction(async (tx: PrismaClient) => {
    const assessment = await tx.assessment.create({
      data: {
        userId: args.userId,
        flow: args.flow,
        mode: null,
        categoryId: args.categoryId,
        areaOfInterestId: area.id,
        jobTitleId: args.jobTitleId,
        difficulty: args.difficulty,
        experienceBand: args.experienceBand,
        requestedQuestionCount: args.count,
        previewEnabled: args.previewEnabled,
        status: initialStatus,
        startedAt: args.previewEnabled ? null : new Date(),
        clientRequestId: args.clientRequestId,
        jdId: args.jd?.jdId ?? null,
        jdSource: args.jd?.jdSource ?? null,
        jdContentSnapshot: args.jd?.content ?? null,
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
        skillId: null, // A4: single primary skill only where round-robin applies
        questionSnapshot: buildSnapshot({
          questionText: q.questionText,
          options: q.options,
        }) as unknown as Record<string, unknown>,
      })),
    });
    return assessment;
  })) as { id: string };

  return { ok: true, assessmentId: created.id, status: initialStatus };
}

export type ReplaceResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-preview" | "ai-required" };

/**
 * Replaces one preview question with the next eligible library question.
 * Lineage only (no FK): replacedFromId records the deleted row's id; the old
 * row is deleted in the same transaction that inserts the new one, keeping
 * (assessmentId, sequence) and (assessmentId, libraryQuestionId) uniques.
 */
export async function replaceQuestion(
  userId: string,
  assessmentQuestionId: string,
): Promise<ReplaceResult> {
  const db = getPrisma();
  const target = (await db.assessmentQuestion.findFirst({
    where: { id: assessmentQuestionId, assessment: { userId, status: "PREVIEW" } },
    select: {
      id: true,
      sequence: true,
      assessment: {
        select: {
          id: true,
          flow: true,
          difficulty: true,
          areaOfInterestId: true,
          jobTitleId: true,
          jdId: true,
          questions: { select: { id: true, libraryQuestionId: true } },
        },
      },
    },
  })) as {
    id: string;
    sequence: number;
    assessment: {
      id: string;
      flow: string;
      difficulty: DifficultyValue;
      areaOfInterestId: string;
      jobTitleId: string | null;
      jdId: string | null;
      questions: { id: string; libraryQuestionId: string | null }[];
    };
  } | null;
  if (!target) return { ok: false, reason: "not-found" };
  const assessment = target.assessment;

  const preferredSkillIds = assessment.jdId
    ? ((await db.jobDescriptionSkill.findMany({
        where: { jobDescriptionId: assessment.jdId },
        select: { skillId: true },
      })) as { skillId: string }[]).map((s) => s.skillId)
    : [];

  const candidates = await selectEligibleQuestions({
    userId,
    flow: assessment.flow === "GENERAL" ? "GENERAL" : "BASIC_MCQ",
    difficulty: assessment.difficulty,
    areaId: assessment.areaOfInterestId,
    jobTitleId: assessment.jobTitleId ?? undefined,
    preferredSkillIds,
    forReplacement: true,
    excludeQuestionIds: assessment.questions
      .map((q) => q.libraryQuestionId)
      .filter((v): v is string => Boolean(v)),
  });
  const next = candidates[0];
  if (!next) return { ok: false, reason: "ai-required" };

  await db.$transaction(async (tx: PrismaClient) => {
    // Delete first: frees (assessmentId, sequence) and (assessmentId,
    // libraryQuestionId) inside this tx so the insert cannot collide.
    await tx.assessmentQuestion.delete({ where: { id: target.id } });
    await tx.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        sequence: target.sequence,
        source: "QUESTION_LIBRARY",
        libraryQuestionId: next.id,
        codingQuestionId: null,
        skillId: null,
        replacedFromId: target.id,
        questionSnapshot: buildSnapshot({
          questionText: next.questionText,
          options: next.options,
        }) as unknown as Record<string, unknown>,
      },
    });
  });
  return { ok: true };
}

export type PreviewData = {
  assessmentId: string;
  areaName: string;
  categoryName: string;
  jobTitleName: string | null;
  difficulty: string;
  experienceBand: string | null;
  previewEnabled: boolean;
  questions: { id: string; sequence: number; text: string; options: { id: string; text: string }[] }[];
};

/** Display-safe preview payload (no correctOptionId, no scoring metadata). */
export async function getPreviewData(
  userId: string,
  assessmentId: string,
): Promise<PreviewData | null> {
  const db = getPrisma();
  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId },
    select: {
      id: true,
      status: true,
      difficulty: true,
      experienceBand: true,
      previewEnabled: true,
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
    status: string;
    difficulty: string;
    experienceBand: string | null;
    previewEnabled: boolean;
    areaOfInterest: { name: string };
    category: { name: string };
    jobTitle: { name: string } | null;
    questions: { id: string; sequence: number; questionSnapshot: unknown }[];
  } | null;
  if (!assessment || assessment.status !== "PREVIEW") return null;

  return {
    assessmentId: assessment.id,
    areaName: assessment.areaOfInterest.name,
    categoryName: assessment.category.name,
    jobTitleName: assessment.jobTitle?.name ?? null,
    difficulty: assessment.difficulty,
    experienceBand: assessment.experienceBand,
    previewEnabled: assessment.previewEnabled,
    questions: assessment.questions.map((q) => {
      const snap: QuestionSnapshot = parseSnapshot(q.questionSnapshot);
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
  };
}

export type StartResult =
  | { ok: true; redirect: string }
  | { ok: false; reason: "not-found" };

/** PREVIEW -> IN_PROGRESS (D-ABANDON-safe: only valid transitions). */
export async function startFromPreview(
  userId: string,
  assessmentId: string,
): Promise<StartResult> {
  const db = getPrisma();
  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId },
    select: { id: true, status: true },
  })) as { id: string; status: string } | null;
  if (!assessment) return { ok: false, reason: "not-found" };
  if (assessment.status === "PREVIEW") {
    await db.assessment.update({
      where: { id: assessment.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
    return { ok: true, redirect: `/assessments/take/${assessment.id}` };
  }
  if (assessment.status === "IN_PROGRESS") {
    return { ok: true, redirect: `/assessments/take/${assessment.id}` };
  }
  return { ok: true, redirect: `/results/${assessment.id}` };
}
