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
import { CODING_COUNT_MAX, CODING_COUNT_MIN } from "@/lib/assessment/limits";
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

  let jdPayload: { jdId: string | null; jdSource: "LIBRARY" | "USER_PASTED"; content: string };
  let jdSkillIds: string[] = [];

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
    jdSkillIds = jd.skills.map((sk) => sk.skillId);
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
    jdPayload = { jdId: null, jdSource: "USER_PASTED", content };
  }

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
