import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  buildCodingSnapshot,
  buildSnapshot,
  isCodingSnapshot,
  parseCodingSnapshot,
  parseSnapshot,
  toCodingClientView,
  type ClientCodingQuestion,
  type QuestionSnapshot,
} from "@/lib/assessment/snapshot";
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
  flow: "GENERAL" | "BASIC_MCQ" | "BASIC_SKILLS_MCQ" | "CODING";
  difficulty: DifficultyValue;
  areaId?: string;
  jobTitleId?: string;
  /** Hard skill filter (QuestionSkill) used for per-skill quota fills. */
  skillId?: string;
  preferredSkillIds?: string[];
  /** Replacement candidate rule (never attempted / previously incorrect). */
  forReplacement?: boolean;
  excludeQuestionIds?: string[];
};

export type EligibleQuestion = {
  id: string;
  difficulty: string;
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
      ...(ctx.skillId ? { skills: { some: { skillId: ctx.skillId } } } : {}),
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
      difficulty: true,
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
    difficulty: r.difficulty,
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

export type CodingSelectionContext = {
  userId: string;
  difficulty: DifficultyValue;
  jobTitleId: string;
  /** Priority ordering only (spec §22: selected skills, JD skills and job
   *  title tags all boost relevance) — coding has no per-skill quotas in V1. */
  preferredSkillIds?: string[];
  excludeQuestionIds?: string[];
  forReplacement?: boolean;
};

export type EligibleCodingQuestion = {
  id: string;
  title: string;
  problemStatement: string;
  language: string;
  starterCode: string | null;
  constraints: string | null;
  skillIds: string[];
  testCases: { id: string; input: string; expectedOutput: string; visibility: string }[];
};

/**
 * CODING selection over the CodingQuestion library: LIVE + difficulty + job
 * title tag (CodingQuestionJobTitle), D-30DAY hard exclusion through
 * UserQuestionHistory.codingQuestionId, deterministic id-asc order with the
 * same preferred-skill boost tiering as the MCQ selector.
 */
export async function selectEligibleCodingQuestions(
  ctx: CodingSelectionContext,
): Promise<EligibleCodingQuestion[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = (await getPrisma().codingQuestion.findMany({
    where: {
      status: "LIVE",
      difficulty: ctx.difficulty,
      jobTitles: { some: { jobTitleId: ctx.jobTitleId } },
      ...(ctx.excludeQuestionIds?.length ? { id: { notIn: ctx.excludeQuestionIds } } : {}),
      NOT: {
        history: { some: { userId: ctx.userId, lastCorrectAt: { gte: thirtyDaysAgo } } },
      },
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
      title: true,
      problemStatement: true,
      language: true,
      starterCode: true,
      constraints: true,
      skills: { select: { skillId: true } },
      testCases: {
        select: { id: true, input: true, expectedOutput: true, visibility: true },
      },
    },
  })) as (Omit<EligibleCodingQuestion, "skillIds"> & {
    skills: { skillId: string }[];
  })[];

  const shaped = rows.map((r) => ({
    id: r.id,
    title: r.title,
    problemStatement: r.problemStatement,
    language: r.language,
    starterCode: r.starterCode,
    constraints: r.constraints,
    testCases: r.testCases,
    skillIds: r.skills.map((sk) => sk.skillId),
  }));

  const preferred = new Set(ctx.preferredSkillIds ?? []);
  if (preferred.size === 0) return shaped;
  return shaped.sort((a, b) => {
    const at = a.skillIds.some((sk) => preferred.has(sk)) ? 0 : 1;
    const bt = b.skillIds.some((sk) => preferred.has(sk)) ? 0 : 1;
    return at - bt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}

export type QuotaSelection = {
  selected: (EligibleQuestion & { quotaSkillId: string })[];
  available: number;
};

/**
 * D-DIST round-robin: cycles the ordered final-skill list assigning one
 * question per skill per pass (even split, remainder to earlier skills),
 * skipping exhausted skills. Deterministic: pools are id-asc ordered and the
 * skill order is supplied by the caller (tier order: user-selected, JD,
 * job title). Returns fewer than `count` only when the library is exhausted
 * (controlled insufficient state upstream - never silent shortening).
 */
export async function selectWithQuotas(
  base: Omit<SelectionContext, "skillId" | "preferredSkillIds">,
  orderedSkillIds: string[],
  count: number,
): Promise<QuotaSelection> {
  const pools = new Map<string, EligibleQuestion[]>();
  for (const skillId of orderedSkillIds) {
    pools.set(skillId, await selectEligibleQuestions({ ...base, skillId }));
  }
  const taken = new Set<string>();
  const selected: (EligibleQuestion & { quotaSkillId: string })[] = [];
  let progressed = true;
  while (selected.length < count && progressed) {
    progressed = false;
    for (const skillId of orderedSkillIds) {
      if (selected.length >= count) break;
      const pool = pools.get(skillId) ?? [];
      const next = pool.find((q) => !taken.has(q.id));
      if (next) {
        taken.add(next.id);
        selected.push({ ...next, quotaSkillId: skillId });
        progressed = true;
      }
    }
  }
  const available = new Set(
    [...pools.values()].flat().map((q) => q.id),
  ).size;
  return { selected, available };
}

export type AssessmentDraft = {
  userId: string;
  clientRequestId: string;
  flow: "GENERAL" | "BASIC_MCQ" | "BASIC_SKILLS_MCQ" | "CODING";
  categoryId: string;
  areaId: string;
  jobTitleId: string | null;
  difficulty: DifficultyValue;
  experienceBand: string | null;
  count: number;
  previewEnabled: boolean;
  jd: { jdId: string | null; jdSource: "LIBRARY" | "USER_PASTED"; content: string } | null;
  selection: SelectionContext;
  /** D-DIST: ordered final skills; switches creation to quota selection. */
  quotaSkills?: string[];
  /** Sources per final skill for AssessmentSkill rows (D-DIST tiers). */
  skillSources?: Record<string, ("USER_SELECTED" | "JD" | "JOB_TITLE")[]>;
  /** CODING: skill provenance rows without quotas (priority ordering only). */
  skillProvenance?: { skillId: string; sources: ("USER_SELECTED" | "JD" | "JOB_TITLE")[] }[];
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

  let selected: (EligibleQuestion & { quotaSkillId: string | null })[];
  let codingSelected: EligibleCodingQuestion[] = [];
  if (args.flow === "CODING") {
    codingSelected = await selectEligibleCodingQuestions({
      userId: args.selection.userId,
      difficulty: args.selection.difficulty,
      jobTitleId: args.selection.jobTitleId ?? "",
      preferredSkillIds: args.selection.preferredSkillIds,
    });
    if (codingSelected.length < args.count) {
      return { ok: false, reason: "insufficient", available: codingSelected.length };
    }
    codingSelected = codingSelected.slice(0, args.count);
    selected = [];
  } else if (args.quotaSkills?.length) {
    const quota = await selectWithQuotas(
      {
        userId: args.selection.userId,
        flow: args.selection.flow,
        difficulty: args.selection.difficulty,
        areaId: args.selection.areaId,
        jobTitleId: args.selection.jobTitleId,
      },
      args.quotaSkills,
      args.count,
    );
    if (quota.selected.length < args.count) {
      return { ok: false, reason: "insufficient", available: quota.available };
    }
    selected = quota.selected;
  } else {
    const eligible = await selectEligibleQuestions(args.selection);
    if (eligible.length < args.count) {
      return { ok: false, reason: "insufficient", available: eligible.length };
    }
    selected = eligible.slice(0, args.count).map((q) => ({ ...q, quotaSkillId: null }));
  }
  const initialStatus = args.previewEnabled ? "PREVIEW" : "IN_PROGRESS";

  const created = (await db.$transaction(async (tx: PrismaClient) => {
    const assessment = await tx.assessment.create({
      data: {
        userId: args.userId,
        flow: args.flow,
        // C3: AssessmentMode distinguishes flow 4's MCQ/CODING shape; flows
        // 1-3 keep null.
        mode: args.flow === "CODING" ? "CODING" : null,
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
      data:
        args.flow === "CODING"
          ? codingSelected.map((q, i) => ({
              assessmentId: assessment.id,
              sequence: i + 1,
              source: "CODING_LIBRARY" as const,
              libraryQuestionId: null,
              codingQuestionId: q.id,
              // Coding V1 has no per-skill quotas (A4 attribution is a
              // quota concept); priority skills live in AssessmentSkill.
              skillId: null,
              questionSnapshot: buildCodingSnapshot(q) as unknown as Record<string, unknown>,
            }))
          : selected.map((q, i) => ({
              assessmentId: assessment.id,
              sequence: i + 1,
              source: "QUESTION_LIBRARY" as const,
              libraryQuestionId: q.id,
              codingQuestionId: null,
              // A4: single primary skill = the quota this question filled.
              skillId: q.quotaSkillId,
              questionSnapshot: buildSnapshot({
                questionText: q.questionText,
                options: q.options,
                difficulty: q.difficulty,
              }) as unknown as Record<string, unknown>,
            })),
    });
    if (args.quotaSkills?.length) {
      await tx.assessmentSkill.createMany({
        data: args.quotaSkills.map((skillId) => ({
          assessmentId: assessment.id,
          skillId,
          sources: args.skillSources?.[skillId] ?? ["JOB_TITLE"],
        })),
      });
    } else if (args.skillProvenance?.length) {
      await tx.assessmentSkill.createMany({
        data: args.skillProvenance.map((row) => ({
          assessmentId: assessment.id,
          skillId: row.skillId,
          sources: row.sources,
        })),
      });
    }
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
      skillId: true,
      assessment: {
        select: {
          id: true,
          flow: true,
          difficulty: true,
          areaOfInterestId: true,
          jobTitleId: true,
          jdId: true,
          questions: {
            select: { id: true, libraryQuestionId: true, codingQuestionId: true },
          },
        },
      },
    },
  })) as {
    id: string;
    sequence: number;
    skillId: string | null;
    assessment: {
      id: string;
      flow: string;
      difficulty: DifficultyValue;
      areaOfInterestId: string;
      jobTitleId: string | null;
      jdId: string | null;
      questions: {
        id: string;
        libraryQuestionId: string | null;
        codingQuestionId: string | null;
      }[];
    };
  } | null;
  if (!target) return { ok: false, reason: "not-found" };
  const assessment = target.assessment;

  // CODING branch: replace from the coding library (never swaps kinds).
  if (assessment.flow === "CODING" && assessment.jobTitleId) {
    const codingCandidates = await selectEligibleCodingQuestions({
      userId,
      difficulty: assessment.difficulty,
      jobTitleId: assessment.jobTitleId,
      preferredSkillIds: assessment.jdId
        ? ((await db.jobDescriptionSkill.findMany({
            where: { jobDescriptionId: assessment.jdId },
            select: { skillId: true },
          })) as { skillId: string }[]).map((r) => r.skillId)
        : [],
      forReplacement: true,
      excludeQuestionIds: assessment.questions
        .map((q) => q.codingQuestionId)
        .filter((v): v is string => Boolean(v)),
    });
    const nextCoding = codingCandidates[0];
    if (!nextCoding) return { ok: false, reason: "ai-required" };

    await db.$transaction(async (tx: PrismaClient) => {
      await tx.assessmentQuestion.delete({ where: { id: target.id } });
      await tx.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          sequence: target.sequence,
          source: "CODING_LIBRARY",
          libraryQuestionId: null,
          codingQuestionId: nextCoding.id,
          skillId: null,
          replacedFromId: target.id,
          questionSnapshot: buildCodingSnapshot(nextCoding) as unknown as Record<
            string,
            unknown
          >,
        },
      });
    });
    return { ok: true };
  }
  if (assessment.flow === "CODING") return { ok: false, reason: "ai-required" };

  const preferredSkillIds = assessment.jdId
    ? ((await db.jobDescriptionSkill.findMany({
        where: { jobDescriptionId: assessment.jdId },
        select: { skillId: true },
      })) as { skillId: string }[]).map((s) => s.skillId)
    : [];

  const candidates = await selectEligibleQuestions({
    userId,
    flow:
      assessment.flow === "BASIC_SKILLS_MCQ"
        ? "BASIC_SKILLS_MCQ"
        : assessment.flow === "GENERAL"
          ? "GENERAL"
          : "BASIC_MCQ",
    difficulty: assessment.difficulty,
    areaId: assessment.areaOfInterestId,
    jobTitleId: assessment.jobTitleId ?? undefined,
    preferredSkillIds,
    skillId: target.skillId ?? undefined,
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
        skillId: target.skillId,
        replacedFromId: target.id,
        questionSnapshot: buildSnapshot({
          questionText: next.questionText,
          options: next.options,
          difficulty: next.difficulty,
        }) as unknown as Record<string, unknown>,
      },
    });
  });
  return { ok: true };
}

export type PreviewMcqQuestion = {
  kind: "MCQ";
  id: string;
  sequence: number;
  text: string;
  options: { id: string; text: string }[];
};

export type PreviewCodingQuestion = ClientCodingQuestion;

export type PreviewData = {
  assessmentId: string;
  flow: string;
  areaName: string;
  categoryName: string;
  jobTitleName: string | null;
  difficulty: string;
  experienceBand: string | null;
  previewEnabled: boolean;
  questions: (PreviewMcqQuestion | PreviewCodingQuestion)[];
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
      flow: true,
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
    flow: string;
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
    flow: assessment.flow,
    areaName: assessment.areaOfInterest.name,
    categoryName: assessment.category.name,
    jobTitleName: assessment.jobTitle?.name ?? null,
    difficulty: assessment.difficulty,
    experienceBand: assessment.experienceBand,
    previewEnabled: assessment.previewEnabled,
    questions: assessment.questions.map((q) => {
      if (isCodingSnapshot(q.questionSnapshot)) {
        return toCodingClientView(q.id, q.sequence, parseCodingSnapshot(q.questionSnapshot));
      }
      const snap: QuestionSnapshot = parseSnapshot(q.questionSnapshot);
      return {
        kind: "MCQ" as const,
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
