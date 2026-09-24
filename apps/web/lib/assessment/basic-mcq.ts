import { getPrisma } from "@/lib/prisma";
import { createAssessment, type SelectionContext } from "@/lib/assessment/engine";
import type { DifficultyValue } from "@/lib/assessment/limits";

/**
 * BASIC_MCQ domain rules (Phase 5).
 *
 * Taxonomy chain is always re-validated SERVER-side:
 *   area LIVE + ROLE_BASED -> job title LIVE + belongs to area + flow BASIC_MCQ
 * Client-provided ids are treated as untrusted lookups, never as truth.
 *
 * JD sources use the Assessment-level enum (LIBRARY / AI_GENERATED /
 * USER_PASTED) - deliberately distinct from JobDescription.source
 * (MANUAL / AI / CSV), which describes how a library JD was authored.
 */

export const EXPERIENCE_BANDS = ["Y0_2", "Y2_5", "Y5_8"] as const;
export type ExperienceBandValue = (typeof EXPERIENCE_BANDS)[number];

export function parseExperience(value: string): ExperienceBandValue | null {
  return (EXPERIENCE_BANDS as readonly string[]).includes(value)
    ? (value as ExperienceBandValue)
    : null;
}

export { PASTED_JD_MAX_CHARS } from "@/lib/assessment/jd-limits";
import type { PrismaClient } from "@prisma/client";
import {
  CODING_COUNT_MAX,
  CODING_COUNT_MIN,
  GENERAL_COUNT_MAX,
  GENERAL_COUNT_MIN,
} from "@/lib/assessment/limits";
import { selectEligibleQuestions } from "@/lib/assessment/engine";
import { getAdaptiveTakingData } from "@/lib/assessment/adaptive";
import { PASTED_JD_MAX_CHARS } from "@/lib/assessment/jd-limits";

export type BasicContext = {
  areaId: string;
  areaName: string;
  jobTitleId: string;
  jobTitleName: string;
  categoryId: string;
};

export type RoleContext = BasicContext & { assessmentFlow: string };

export type RoleContextResult =
  | { ok: true; context: RoleContext }
  | { ok: false; reason: "invalid-area" | "invalid-job-title" };

/**
 * Flow-aware chain validation: the DATABASE decides which flow a job title
 * runs (JobTitle.assessmentFlow); the client never chooses it.
 */
export async function validateRoleContext(
  areaId: string,
  jobTitleId: string,
): Promise<RoleContextResult> {
  const area = (await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId, status: "LIVE", classification: "ROLE_BASED" },
    select: { id: true, name: true, categoryId: true },
  })) as { id: string; name: string; categoryId: string } | null;
  if (!area) return { ok: false, reason: "invalid-area" };

  const jobTitle = (await getPrisma().jobTitle.findFirst({
    where: { id: jobTitleId, areaOfInterestId: area.id, status: "LIVE" },
    select: { id: true, name: true, assessmentFlow: true },
  })) as { id: string; name: string; assessmentFlow: string } | null;
  if (!jobTitle) return { ok: false, reason: "invalid-job-title" };

  return {
    ok: true,
    context: {
      areaId: area.id,
      areaName: area.name,
      jobTitleId: jobTitle.id,
      jobTitleName: jobTitle.name,
      categoryId: area.categoryId,
      assessmentFlow: jobTitle.assessmentFlow,
    },
  };
}

export type ContextResult =
  | { ok: true; context: BasicContext }
  | { ok: false; reason: "invalid-area" | "invalid-job-title" | "wrong-flow" };

/** Server-side validation of the area -> job title -> flow chain. */
export async function validateBasicContext(
  areaId: string,
  jobTitleId: string,
): Promise<ContextResult> {
  const area = (await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId, status: "LIVE", classification: "ROLE_BASED" },
    select: { id: true, name: true, categoryId: true },
  })) as { id: string; name: string; categoryId: string } | null;
  if (!area) return { ok: false, reason: "invalid-area" };

  const jobTitle = (await getPrisma().jobTitle.findFirst({
    where: { id: jobTitleId, areaOfInterestId: area.id, status: "LIVE" },
    select: { id: true, name: true, assessmentFlow: true },
  })) as { id: string; name: string; assessmentFlow: string } | null;
  if (!jobTitle) return { ok: false, reason: "invalid-job-title" };
  if (jobTitle.assessmentFlow !== "BASIC_MCQ") return { ok: false, reason: "wrong-flow" };

  return {
    ok: true,
    context: {
      areaId: area.id,
      areaName: area.name,
      jobTitleId: jobTitle.id,
      jobTitleName: jobTitle.name,
      categoryId: area.categoryId,
    },
  };
}

/** Active skills attached to a job title (DB-owned; users never invent skills). */
export async function listTitleSkills(jobTitleId: string): Promise<{ id: string; name: string }[]> {
  const rows = (await getPrisma().jobTitleSkill.findMany({
    where: { jobTitleId, skill: { isActive: true } },
    select: { skill: { select: { id: true, name: true } } },
    orderBy: { skill: { name: "asc" } },
  })) as { skill: { id: string; name: string } }[];
  return rows.map((r) => r.skill);
}

export type LibraryJd = {
  id: string;
  title: string;
  skills: string[];
};

/** Library JDs for a job title at the chosen experience band (LIVE only). */
export async function listLibraryJds(
  jobTitleId: string,
  band: ExperienceBandValue,
): Promise<LibraryJd[]> {
  const rows = (await getPrisma().jobDescription.findMany({
    where: { jobTitleId, experienceBand: band, status: "LIVE" },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      skills: { select: { skill: { select: { name: true } } } },
    },
  })) as { id: string; title: string; skills: { skill: { name: string } }[] }[];
  return rows.map((r) => ({ id: r.id, title: r.title, skills: r.skills.map((s) => s.skill.name) }));
}

export type JdChoice =
  | { source: "LIBRARY"; jdId: string }
  | { source: "USER_PASTED"; content: string };

export type CreateBasicResult =
  | { ok: true; assessmentId: string; status: "PREVIEW" | "IN_PROGRESS" }
  | { ok: false; reason: "insufficient"; available: number }
  | { ok: false; reason: "invalid-area" | "invalid-job-title" | "wrong-flow" }
  | { ok: false; reason: "invalid-jd"; message: string };

export async function createBasicMcqAssessment(args: {
  userId: string;
  areaId: string;
  jobTitleId: string;
  difficulty: DifficultyValue;
  experience: ExperienceBandValue;
  count: number;
  previewEnabled: boolean;
  jd: JdChoice;
  clientRequestId: string;
}): Promise<CreateBasicResult> {
  const ctxResult = await validateBasicContext(args.areaId, args.jobTitleId);
  if (!ctxResult.ok) return { ok: false, reason: ctxResult.reason };
  const ctx = ctxResult.context;

  let jdPayload: { jdId: string | null; jdSource: "LIBRARY" | "USER_PASTED"; content: string };
  let preferredSkillIds: string[] = [];

  if (args.jd.source === "LIBRARY") {
    const jd = (await getPrisma().jobDescription.findFirst({
      where: {
        id: args.jd.jdId,
        jobTitleId: ctx.jobTitleId,
        experienceBand: args.experience,
        status: "LIVE",
      },
      select: { id: true, content: true, skills: { select: { skillId: true } } },
    })) as { id: string; content: string; skills: { skillId: string }[] } | null;
    if (!jd) {
      return {
        ok: false,
        reason: "invalid-jd",
        message: "That job description is not available for this job title and experience band.",
      };
    }
    jdPayload = { jdId: jd.id, jdSource: "LIBRARY", content: jd.content };
    preferredSkillIds = jd.skills.map((s) => s.skillId);
  } else {
    const content = args.jd.content.trim();
    if (content.length === 0) {
      return { ok: false, reason: "invalid-jd", message: "Pasted job description is empty." };
    }
    if (content.length > PASTED_JD_MAX_CHARS) {
      return {
        ok: false,
        reason: "invalid-jd",
        message: `Pasted job description is too long (max ${PASTED_JD_MAX_CHARS} characters).`,
      };
    }
    // User-pasted JDs are snapshot-only: NO library JobDescription row is
    // created, so the library stays curated (approved rule).
    jdPayload = { jdId: null, jdSource: "USER_PASTED", content };
  }

  const selection: SelectionContext = {
    userId: args.userId,
    flow: "BASIC_MCQ",
    difficulty: args.difficulty,
    jobTitleId: ctx.jobTitleId,
    preferredSkillIds,
  };

  const result = await createAssessment({
    userId: args.userId,
    clientRequestId: args.clientRequestId,
    flow: "BASIC_MCQ",
    categoryId: ctx.categoryId,
    areaId: ctx.areaId,
    jobTitleId: ctx.jobTitleId,
    difficulty: args.difficulty,
    experienceBand: args.experience,
    count: args.count,
    previewEnabled: args.previewEnabled,
    jd: jdPayload,
    selection,
  });
  return result;
}

export type JdPayload = {
  jdId: string | null;
  jdSource: "LIBRARY" | "USER_PASTED";
  content: string;
};

export type JdResolution =
  | { ok: true; jdPayload: JdPayload; jdSkillIds: string[] }
  | { ok: false; reason: "invalid-jd"; message: string };

/**
 * JD validation shared by standard and adaptive creation: LIBRARY JDs must
 * belong to the job title + experience band and be LIVE; USER_PASTED JDs are
 * length-checked and snapshot-stored without touching the library.
 */
export async function resolveJdPayload(
  jd: JdChoice,
  jobTitleId: string,
  experience: ExperienceBandValue,
): Promise<JdResolution> {
  if (jd.source === "LIBRARY") {
    const row = (await getPrisma().jobDescription.findFirst({
      where: { id: jd.jdId, jobTitleId, experienceBand: experience, status: "LIVE" },
      select: { id: true, content: true, skills: { select: { skillId: true } } },
    })) as { id: string; content: string; skills: { skillId: string }[] } | null;
    if (!row) {
      return {
        ok: false,
        reason: "invalid-jd",
        message: "That job description is not available for this job title and experience band.",
      };
    }
    return {
      ok: true,
      jdPayload: { jdId: row.id, jdSource: "LIBRARY", content: row.content },
      jdSkillIds: row.skills.map((sk) => sk.skillId),
    };
  }
  const content = jd.content.trim();
  if (content.length === 0) {
    return { ok: false, reason: "invalid-jd", message: "Pasted job description is empty." };
  }
  if (content.length > PASTED_JD_MAX_CHARS) {
    return {
      ok: false,
      reason: "invalid-jd",
      message: `Pasted job description is too long (max ${PASTED_JD_MAX_CHARS} characters).`,
    };
  }
  return {
    ok: true,
    jdPayload: { jdId: null, jdSource: "USER_PASTED", content },
    jdSkillIds: [],
  };
}

export type CreateRoleResult =
  | { ok: true; assessmentId: string; status: "PREVIEW" | "IN_PROGRESS" }
  | { ok: false; reason: "insufficient"; available: number }
  | { ok: false; reason: "invalid-area" | "invalid-job-title" | "unsupported-flow" }
  | { ok: false; reason: "invalid-jd"; message: string }
  | { ok: false; reason: "invalid-config"; message: string };

/**
 * Role-based creation for BASIC_MCQ and BASIC_SKILLS_MCQ. The flow comes from
 * the database (JobTitle.assessmentFlow), never from the client.
 *
 * BASIC_SKILLS_MCQ (D-DIST): final skills = user-selected (validated against
 * job-title + JD skills) ordered first, then JD-only skills, then job-title
 * leftovers; round-robin even split across that order; each question's
 * AssessmentQuestion.skillId records the quota it filled (A4) and
 * AssessmentSkill rows record the tier sources.
 */
export async function createRoleAssessment(args: {
  userId: string;
  areaId: string;
  jobTitleId: string;
  difficulty: DifficultyValue;
  experience: ExperienceBandValue;
  count: number;
  previewEnabled: boolean;
  jd: JdChoice;
  clientRequestId: string;
  selectedSkillIds: string[];
}): Promise<CreateRoleResult> {
  const ctxResult = await validateRoleContext(args.areaId, args.jobTitleId);
  if (!ctxResult.ok) return { ok: false, reason: ctxResult.reason };
  const ctx = ctxResult.context;
  if (
    ctx.assessmentFlow !== "BASIC_MCQ" &&
    ctx.assessmentFlow !== "BASIC_SKILLS_MCQ" &&
    ctx.assessmentFlow !== "CODING"
  ) {
    return { ok: false, reason: "unsupported-flow" };
  }
  const isCoding = ctx.assessmentFlow === "CODING";
  // D-LIMITS: coding mode is bounded to 1-10 challenges.
  if (isCoding && (args.count < CODING_COUNT_MIN || args.count > CODING_COUNT_MAX)) {
    return {
      ok: false,
      reason: "invalid-config",
      message: `Coding assessments contain between ${CODING_COUNT_MIN} and ${CODING_COUNT_MAX} challenges.`,
    };
  }

  const jdResolution = await resolveJdPayload(args.jd, ctx.jobTitleId, args.experience);
  if (!jdResolution.ok) return jdResolution;
  const { jdPayload, jdSkillIds } = jdResolution;

  const isSkillsFlow = ctx.assessmentFlow === "BASIC_SKILLS_MCQ";
  let quotaSkills: string[] | undefined;
  let skillSources: Record<string, ("USER_SELECTED" | "JD" | "JOB_TITLE")[]> | undefined;
  let skillProvenance: { skillId: string; sources: ("USER_SELECTED" | "JD" | "JOB_TITLE")[] }[] | undefined;
  let codingPreferredSkillIds: string[] | undefined;

  if (isSkillsFlow || isCoding) {
    const titleSkills = (await listTitleSkills(ctx.jobTitleId)).map((sk) => sk.id);
    const allowed = new Set([...titleSkills, ...jdSkillIds]);
    // Client-selected ids are untrusted: intersect with DB-owned skill sets.
    const userSelected = args.selectedSkillIds.filter((id) => allowed.has(id));
    const ordered = [
      ...userSelected,
      ...jdSkillIds.filter((id) => !userSelected.includes(id)),
      ...titleSkills.filter((id) => !userSelected.includes(id) && !jdSkillIds.includes(id)),
    ];
    if (ordered.length === 0) {
      // Coding still works without skills (the library is searched by job
      // title tags too); only the skills-based MCQ flow requires them.
      if (!isCoding) {
        return {
          ok: false,
          reason: "invalid-jd",
          message: "This job title has no skills configured yet, so a skills-based assessment cannot be built.",
        };
      }
    }
    if (isCoding) {
      // Priority ordering only (spec §22) — no per-skill quotas for coding.
      codingPreferredSkillIds = ordered;
      skillProvenance = ordered.map((id) => {
        const sources: ("USER_SELECTED" | "JD" | "JOB_TITLE")[] = [];
        if (userSelected.includes(id)) sources.push("USER_SELECTED");
        if (jdSkillIds.includes(id)) sources.push("JD");
        if (titleSkills.includes(id)) sources.push("JOB_TITLE");
        return { skillId: id, sources };
      });
    } else {
    quotaSkills = ordered;
    skillSources = {};
    for (const id of ordered) {
      const sources: ("USER_SELECTED" | "JD" | "JOB_TITLE")[] = [];
      if (userSelected.includes(id)) sources.push("USER_SELECTED");
      if (jdSkillIds.includes(id)) sources.push("JD");
      if (titleSkills.includes(id)) sources.push("JOB_TITLE");
      skillSources[id] = sources;
    }
    }
  }

  const result = await createAssessment({
    userId: args.userId,
    clientRequestId: args.clientRequestId,
    flow: isCoding ? "CODING" : isSkillsFlow ? "BASIC_SKILLS_MCQ" : "BASIC_MCQ",
    categoryId: ctx.categoryId,
    areaId: ctx.areaId,
    jobTitleId: ctx.jobTitleId,
    difficulty: args.difficulty,
    experienceBand: args.experience,
    count: args.count,
    previewEnabled: args.previewEnabled,
    jd: jdPayload,
    selection: {
      userId: args.userId,
      flow: isCoding ? "CODING" : isSkillsFlow ? "BASIC_SKILLS_MCQ" : "BASIC_MCQ",
      difficulty: args.difficulty,
      jobTitleId: ctx.jobTitleId,
      preferredSkillIds: isCoding ? codingPreferredSkillIds : jdSkillIds,
    },
    quotaSkills,
    skillSources,
    skillProvenance,
  });
  return result;
}

// ---------------------------------------------------------------------------
// Adaptive Assessment V1 creation (Phase 8)
// ---------------------------------------------------------------------------

export type CreateAdaptiveResult =
  | { ok: true; assessmentId: string; status: "IN_PROGRESS" }
  | { ok: false; reason: "insufficient"; available: number }
  | { ok: false; reason: "invalid-area" | "invalid-job-title" | "unsupported-flow" }
  | { ok: false; reason: "invalid-jd" | "invalid-config"; message: string };

/**
 * Creates an ADAPTIVE assessment: an optional mode on top of the existing
 * BASIC_MCQ / BASIC_SKILLS_MCQ flows (never a fifth flow, never for GENERAL
 * or CODING in V1).
 *
 * Differences from standard creation (everything else is identical — JD
 * validation, skill tiering, ownership, clientRequestId idempotency):
 * - No questions are pre-selected. The assessment starts IN_PROGRESS with
 *   zero AssessmentQuestion rows; the adaptive controller serves them one at
 *   a time (Parts L/M), each as a normal immutable snapshot row.
 * - Preview is impossible by construction (there is no fixed set to preview),
 *   so adaptive + preview is rejected here and disabled in the UI.
 * - AssessmentSkill provenance rows are written for BOTH skills-flow and
 *   BASIC_MCQ so the tier-ordered skill set can be reconstructed on every
 *   request (the blueprint's only inputs are count + this ordered set).
 */
export async function createAdaptiveAssessment(args: {
  userId: string;
  areaId: string;
  jobTitleId: string;
  difficulty: DifficultyValue;
  experience: ExperienceBandValue;
  count: number;
  previewEnabled: boolean;
  jd: JdChoice;
  clientRequestId: string;
  selectedSkillIds: string[];
}): Promise<CreateAdaptiveResult> {
  if (args.previewEnabled) {
    return {
      ok: false,
      reason: "invalid-config",
      message:
        "Adaptive assessments start immediately — preview is only available in Standard mode.",
    };
  }
  if (args.count < GENERAL_COUNT_MIN || args.count > GENERAL_COUNT_MAX) {
    return {
      ok: false,
      reason: "invalid-config",
      message: `Question count must be between ${GENERAL_COUNT_MIN} and ${GENERAL_COUNT_MAX}.`,
    };
  }

  const ctxResult = await validateRoleContext(args.areaId, args.jobTitleId);
  if (!ctxResult.ok) return { ok: false, reason: ctxResult.reason };
  const ctx = ctxResult.context;
  if (ctx.assessmentFlow !== "BASIC_MCQ" && ctx.assessmentFlow !== "BASIC_SKILLS_MCQ") {
    return { ok: false, reason: "unsupported-flow" };
  }
  const isSkillsFlow = ctx.assessmentFlow === "BASIC_SKILLS_MCQ";

  // Idempotency (spec §43): replays of the same clientRequestId return the
  // originally created assessment; adaptive assessments are always
  // IN_PROGRESS (preview rejected above).
  const existing = (await getPrisma().assessment.findUnique({
    where: { clientRequestId: args.clientRequestId },
    select: { id: true, userId: true, status: true },
  })) as { id: string; userId: string; status: string } | null;
  if (existing) {
    if (existing.userId !== args.userId) return { ok: false, reason: "invalid-job-title" };
    return { ok: true, assessmentId: existing.id, status: "IN_PROGRESS" };
  }

  const jdResolution = await resolveJdPayload(args.jd, ctx.jobTitleId, args.experience);
  if (!jdResolution.ok) return jdResolution;
  const { jdPayload, jdSkillIds } = jdResolution;

  // Tier-ordered final skill set (same ownership rules as the standard
  // skills flow: client ids are intersected with DB-owned sets).
  const titleSkills = (await listTitleSkills(ctx.jobTitleId)).map((sk) => sk.id);
  const allowed = new Set([...titleSkills, ...jdSkillIds]);
  const userSelected = args.selectedSkillIds.filter((id) => allowed.has(id));
  const ordered = [
    ...userSelected,
    ...jdSkillIds.filter((id) => !userSelected.includes(id)),
    ...titleSkills.filter((id) => !userSelected.includes(id) && !jdSkillIds.includes(id)),
  ];
  if (isSkillsFlow && ordered.length === 0) {
    return {
      ok: false,
      reason: "invalid-jd",
      message:
        "This job title has no skills configured yet, so a skills-based assessment cannot be built.",
    };
  }
  // BASIC_MCQ with no skills anywhere → difficulty-only adaptive (allowed).

  // Sanity gate: at least one eligible question must exist for this
  // title/flow at the start difficulty (30-day rule included). Deeper
  // exhaustion mid-assessment is a controlled state in the taking screen —
  // questions are never fabricated.
  const startPool = await selectEligibleQuestions({
    userId: args.userId,
    flow: ctx.assessmentFlow,
    difficulty: args.difficulty,
    jobTitleId: ctx.jobTitleId,
  });
  if (startPool.length === 0) {
    return { ok: false, reason: "insufficient", available: 0 };
  }

  const skillSources = (id: string): ("USER_SELECTED" | "JD" | "JOB_TITLE")[] => {
    const sources: ("USER_SELECTED" | "JD" | "JOB_TITLE")[] = [];
    if (userSelected.includes(id)) sources.push("USER_SELECTED");
    if (jdSkillIds.includes(id)) sources.push("JD");
    if (titleSkills.includes(id)) sources.push("JOB_TITLE");
    return sources;
  };

  const db = getPrisma();
  const created = (await db.$transaction(async (tx: PrismaClient) => {
    const assessment = await tx.assessment.create({
      data: {
        userId: args.userId,
        flow: ctx.assessmentFlow,
        mode: null,
        adaptiveEnabled: true,
        categoryId: ctx.categoryId,
        areaOfInterestId: ctx.areaId,
        jobTitleId: ctx.jobTitleId,
        difficulty: args.difficulty,
        experienceBand: args.experience,
        requestedQuestionCount: args.count,
        previewEnabled: false,
        status: "IN_PROGRESS",
        startedAt: new Date(),
        clientRequestId: args.clientRequestId,
        jdId: jdPayload.jdId,
        jdSource: jdPayload.jdSource,
        jdContentSnapshot: jdPayload.content,
      },
      select: { id: true },
    });
    if (ordered.length > 0) {
      await tx.assessmentSkill.createMany({
        data: ordered.map((skillId) => ({
          assessmentId: assessment.id,
          skillId,
          sources: skillSources(skillId),
        })),
      });
    }
    return assessment;
  })) as { id: string };

  // Serve the first question through the same read-guarantee used on every
  // later request. If the pool cannot serve even one question (raced library
  // change), roll the stillborn assessment back — never leave an empty shell.
  const firstData = await getAdaptiveTakingData(args.userId, created.id);
  if (!firstData || (firstData.exhausted && firstData.served === 0)) {
    await db.assessment.delete({ where: { id: created.id } }).catch(() => undefined);
    return { ok: false, reason: "insufficient", available: 0 };
  }

  return { ok: true, assessmentId: created.id, status: "IN_PROGRESS" };
}
