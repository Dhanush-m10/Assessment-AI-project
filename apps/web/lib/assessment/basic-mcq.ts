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
import { PASTED_JD_MAX_CHARS } from "@/lib/assessment/jd-limits";

export type BasicContext = {
  areaId: string;
  areaName: string;
  jobTitleId: string;
  jobTitleName: string;
  categoryId: string;
};

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
