import "server-only";

import { getPrisma } from "@/lib/prisma";
import {
  generateCoding,
  generateMcq,
  type CodingGenerationRequest,
  type GeneratedCoding,
  type GeneratedMcq,
  type McqGenerationRequest,
} from "@/lib/ai-service/client";
import {
  normalizeText,
  validateGeneratedCoding,
  validateGeneratedMcq,
  type ValidatedGeneratedCoding,
  type ValidatedGeneratedMcq,
} from "@/lib/assessment/generation";
import type { AssessmentFlowValue, DifficultyValue } from "@/lib/assessment/limits";
import type { EligibleCodingQuestion, EligibleQuestion } from "@/lib/assessment/engine";

/**
 * AI gap-fill for `createAssessment` (Phase 3D).
 *
 * Called ONLY from the engine's insufficient branches, with the exact gap
 * (`requestedCount - selectedCount`), and ONLY before the persistence
 * transaction. Contract for every function:
 *
 *  - exactly ONE AI request per generation batch (per missing skill quota
 *    for BASIC_SKILLS_MCQ — V1),
 *  - the EXISTING deterministic validator (lib/assessment/generation.ts)
 *    re-checks everything; no second duplicate algorithm here,
 *  - full-gap rule (V1): if fewer valid questions than the gap come back,
 *    the caller falls back to the existing controlled `insufficient`
 *    behavior (never a partial assessment),
 *  - every failure (service, timeout, validation, duplicates) resolves to
 *    `null` — these functions NEVER throw, so the create path degrades to
 *    the pre-existing behavior instead of crashing,
 *  - authoritative context only: flow / difficulty / skillId / areaId /
 *    jobTitleId come from server state; AI-returned metadata is never
 *    trusted,
 *  - prompt names (area/job title/skill) are fetched from the database,
 *    never from client input.
 */

// ------------------------------------------------------------------ test seam

type GenerationClient = {
  generateMcq: typeof generateMcq;
  generateCoding: typeof generateCoding;
};

let activeClient: GenerationClient = { generateMcq, generateCoding };

/** Harness-only seam: stub the AI client (tests never hit a real service).
 *  Passing null restores the real client. */
export function setGenerationClientForTests(next: GenerationClient | null): void {
  activeClient = next ?? { generateMcq, generateCoding };
}

const newId = (): string => crypto.randomUUID();

// ------------------------------------------------------- prompt name lookups

async function fetchAreaName(areaId: string): Promise<string | null> {
  const row = (await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId },
    select: { name: true },
  })) as { name: string } | null;
  return row?.name ?? null;
}

async function fetchJobTitleName(jobTitleId: string): Promise<string | null> {
  const row = (await getPrisma().jobTitle.findFirst({
    where: { id: jobTitleId },
    select: { name: true },
  })) as { name: string } | null;
  return row?.name ?? null;
}

async function fetchSkillNames(skillIds: string[]): Promise<Map<string, string>> {
  if (skillIds.length === 0) return new Map();
  const rows = (await getPrisma().skill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true, name: true },
  })) as { id: string; name: string }[];
  return new Map(rows.map((r) => [r.id, r.name]));
}

// ------------------------------------------------------------- shape mapping

/** Map a validated generated MCQ to the engine's EligibleQuestion shape.
 *  Option ids are fresh UUIDs; the engine's transaction creates DRAFT
 *  Question/QuestionOption anchor rows with exactly these ids (see the
 *  UserAnswer.selectedOptionId FK — an answered MCQ must reference a real
 *  option row). */
function toEligibleQuestion(item: ValidatedGeneratedMcq): EligibleQuestion {
  return {
    id: newId(),
    difficulty: item.difficulty,
    questionText: item.questionText,
    options: item.options.map((o) => ({
      id: newId(),
      position: o.position,
      text: o.text,
      isCorrect: o.isCorrect,
    })),
    skillIds: [],
  };
}

/** Map a validated generated coding challenge to EligibleCodingQuestion.
 *  Test-case ids are fresh UUIDs (snapshot-ready; no FK exists on them). */
function toEligibleCoding(item: ValidatedGeneratedCoding): EligibleCodingQuestion {
  return {
    id: newId(),
    title: item.title,
    problemStatement: item.problemStatement,
    language: item.language,
    starterCode: item.starterCode,
    constraints: item.constraints,
    skillIds: [],
    testCases: item.testCases.map((t) => ({
      id: newId(),
      input: t.input,
      expectedOutput: t.expectedOutput,
      visibility: t.visibility,
    })),
  };
}

// ------------------------------------------------------------------- MCQ gap

/**
 * Fills the ENTIRE remaining gap of a plain MCQ path (GENERAL or BASIC_MCQ)
 * with ONE AI request. Returns the generated items, or `null` on any
 * failure (the caller returns the existing `insufficient` result).
 */
export async function fillPlainMcqGap(args: {
  flow: AssessmentFlowValue;
  difficulty: DifficultyValue;
  gap: number;
  areaId: string | null;
  jobTitleId: string | null;
}): Promise<EligibleQuestion[] | null> {
  try {
    if (args.gap <= 0) return [];
    const [areaName, jobTitleName] = await Promise.all([
      args.areaId ? fetchAreaName(args.areaId) : Promise.resolve(null),
      args.jobTitleId ? fetchJobTitleName(args.jobTitleId) : Promise.resolve(null),
    ]);
    const request: McqGenerationRequest = {
      flow: args.flow,
      difficulty: args.difficulty,
      count: args.gap,
      area: args.flow === "GENERAL" ? areaName ?? undefined : undefined,
      jobTitle: args.flow === "BASIC_MCQ" ? jobTitleName ?? undefined : undefined,
    };
    const items = await activeClient.generateMcq(request);
    const result = await validateGeneratedMcq(items, {
      flow: args.flow,
      difficulty: args.difficulty,
      count: args.gap,
      skillId: null,
      areaId: args.areaId,
      jobTitleId: args.jobTitleId,
    });
    // Full-gap rule (V1): anything short of the exact gap → no partial fill.
    if (!result.ok || result.questions.length !== args.gap) return null;
    return result.questions.map(toEligibleQuestion);
  } catch {
    return null;
  }
}

/**
 * Per-skill gap for BASIC_SKILLS_MCQ quota fills. Targets mirror the
 * selectWithQuotas round-robin (D-DIST even split: base per skill, +1 for
 * the first `count % n` skills). The sum of gaps equals the overall gap
 * (defensively clamped).
 */
export function computeSkillGaps(args: {
  count: number;
  orderedSkillIds: string[];
  allocatedBySkill: Map<string, number>;
}): { skillId: string; count: number }[] {
  const { count, orderedSkillIds, allocatedBySkill } = args;
  const n = orderedSkillIds.length;
  if (n === 0) return [];
  const base = Math.floor(count / n);
  const remainder = count % n;
  const gaps = orderedSkillIds.map((skillId, i) => {
    const target = base + (i < remainder ? 1 : 0);
    return { skillId, count: Math.max(0, target - (allocatedBySkill.get(skillId) ?? 0)) };
  });
  const overall = count - [...allocatedBySkill.values()].reduce((a, b) => a + b, 0);
  let total = gaps.reduce((a, g) => a + g.count, 0);
  if (total > overall) {
    for (let i = gaps.length - 1; i >= 0 && total > overall; i--) {
      const excess = Math.min(gaps[i].count, total - overall);
      gaps[i].count -= excess;
      total -= excess;
    }
  }
  return gaps;
}

/**
 * Fills per-skill quota gaps (BASIC_SKILLS_MCQ): ONE AI request per missing
 * skill quota, in the caller's skill order. `existingNormalizedTexts` (the
 * LIVE pool for this flow/difficulty/job title, fetched once by the engine)
 * is required so cross-batch duplicates are also rejected; accepted texts
 * are appended to it as the batches progress. Returns items with the
 * authoritative `quotaSkillId` attribution, or `null` on any failure.
 */
export async function fillQuotaGaps(args: {
  difficulty: DifficultyValue;
  jobTitleId: string;
  gaps: { skillId: string; count: number }[];
  existingNormalizedTexts: string[];
}): Promise<(EligibleQuestion & { quotaSkillId: string })[] | null> {
  try {
    if (args.gaps.every((g) => g.count <= 0)) return [];
    const jobTitleName = await fetchJobTitleName(args.jobTitleId);
    const needed = args.gaps.filter((g) => g.count > 0);
    const skillNames = await fetchSkillNames(needed.map((g) => g.skillId));
    const existing: string[] = [...args.existingNormalizedTexts];
    const out: (EligibleQuestion & { quotaSkillId: string })[] = [];
    for (const gap of args.gaps) {
      if (gap.count <= 0) continue;
      const items: GeneratedMcq[] = await activeClient.generateMcq({
        flow: "BASIC_SKILLS_MCQ",
        difficulty: args.difficulty,
        count: gap.count,
        skill: skillNames.get(gap.skillId) ?? undefined,
        jobTitle: jobTitleName ?? undefined,
      });
      const result = await validateGeneratedMcq(items, {
        flow: "BASIC_SKILLS_MCQ",
        difficulty: args.difficulty,
        count: gap.count,
        skillId: gap.skillId,
        jobTitleId: args.jobTitleId,
        areaId: null,
        existingNormalizedTexts: existing,
      });
      if (!result.ok || result.questions.length !== gap.count) return null;
      for (const q of result.questions) {
        out.push({ ...toEligibleQuestion(q), quotaSkillId: gap.skillId });
        existing.push(normalizeText(q.questionText));
      }
    }
    return out;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------- coding gap

/**
 * Derives the authoritative language for generated coding challenges:
 *  - the selected library challenges' language, when they all agree;
 *  - otherwise the dominant language of the LIVE pool for the job title
 *    (ONE bulk query, deterministic alphabetical tiebreak);
 *  - `null` when no reference exists — generation without an authoritative
 *    language is refused (no invented defaults).
 */
export async function resolveCodingLanguage(args: {
  selectedLanguages: string[];
  jobTitleId: string;
}): Promise<string | null> {
  const seen = new Set<string>();
  for (const raw of args.selectedLanguages) {
    const lang = raw.trim().toLowerCase();
    if (!lang) continue;
    if (seen.size > 0 && !seen.has(lang)) break; // mixed → pool majority
    seen.add(lang);
  }
  if (seen.size === 1) return [...seen][0];

  const rows = (await getPrisma().codingQuestion.findMany({
    where: { status: "LIVE", jobTitles: { some: { jobTitleId: args.jobTitleId } } },
    select: { language: true },
  })) as { language: string }[];
  const tally = new Map<string, number>();
  for (const row of rows) {
    const lang = row.language.trim().toLowerCase();
    if (lang) tally.set(lang, (tally.get(lang) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [lang, count] of [...tally.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Fills the coding gap with ONE AI request. The language is authoritative
 * (server-derived, validated against the Judge0 map inside the validator);
 * Judge0 is NOT executed here — execution stays in the taking/submit path.
 * Returns generated items or `null` on any failure.
 */
export async function fillCodingGap(args: {
  difficulty: DifficultyValue;
  gap: number;
  jobTitleId: string;
  language: string;
}): Promise<EligibleCodingQuestion[] | null> {
  try {
    if (args.gap <= 0) return [];
    const jobTitleName = await fetchJobTitleName(args.jobTitleId);
    const request: CodingGenerationRequest = {
      flow: "CODING",
      difficulty: args.difficulty,
      count: args.gap,
      jobTitle: jobTitleName ?? undefined,
      language: args.language,
    };
    const items: GeneratedCoding[] = await activeClient.generateCoding(request);
    const result = await validateGeneratedCoding(items, {
      difficulty: args.difficulty,
      count: args.gap,
      language: args.language,
      jobTitleId: args.jobTitleId,
    });
    if (!result.ok || result.questions.length !== args.gap) return null;
    return result.questions.map(toEligibleCoding);
  } catch {
    return null;
  }
}
