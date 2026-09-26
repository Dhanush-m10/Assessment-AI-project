import "server-only";

import { getPrisma } from "@/lib/prisma";
import { resolveJudge0Language } from "@/lib/judge0/languages";
import type { AssessmentFlowValue, DifficultyValue } from "@/lib/assessment/limits";
import type { GeneratedCoding, GeneratedMcq } from "@/lib/ai-service/client";
import type { AiServiceError } from "@/lib/ai-service/client";

/**
 * Deterministic application-layer validation of AI-generated questions
 * (Phase 3C).
 *
 * The AI service (apps/ai-service) already performs structural validation;
 * this layer is the authoritative re-check BEFORE anything may be persisted:
 *
 *  - re-validates every structural invariant (defense in depth),
 *  - attaches the AUTHORITATIVE server-side context (flow, difficulty,
 *    skillId, areaId, jobTitleId) — AI-returned names/metadata are NEVER
 *    trusted for database linkage,
 *  - rejects duplicates: within the batch and against the live library,
 *    using normalized text (lowercase/trim/whitespace-collapse — same rule
 *    as prisma/seed-data.ts `norm()`). No embeddings/semantic similarity.
 *
 * Generated questions remain EPHEMERAL in this phase: nothing here writes
 * Question/CodingQuestion/AssessmentQuestion rows. Phase 3D wires these
 * results into createAssessment (source = AI_GENERATED /
 * AI_CODING_GENERATED, libraryQuestionId/codingQuestionId = null).
 *
 * The validated shapes are ready for the EXISTING snapshot builders in
 * lib/assessment/snapshot.ts: attach generated option ids and call
 * buildSnapshot / buildCodingSnapshot unchanged.
 */

// ------------------------------------------------------------- failure types

export type GenerationFailureReason =
  | "service-unavailable" // AI service unreachable (network/DNS/refused)
  | "service-unauthorized" // 401: server credentials rejected
  | "service-unconfigured" // 503 configuration-error (either side)
  | "service-timeout" // our bounded timeout or the service's provider timeout
  | "provider-error" // 502 provider failure
  | "malformed-response" // 502 malformed-provider-output / unexpected HTTP
  | "validation-failure" // context/structural validation failed
  | "duplicate-content" // generated content duplicates existing content
  | "insufficient"; // fewer valid generated questions than requested

/** Typed application error for the generation pipeline (Phase 3D maps these
 *  to the existing controlled `insufficient` user-facing behavior). */
export class GenerationError extends Error {
  constructor(
    readonly reason: GenerationFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

/** Map a client error (lib/ai-service/client.ts) to the application layer. */
export function fromAiServiceError(error: AiServiceError): GenerationError {
  switch (error.code) {
    case "unauthorized":
      return new GenerationError("service-unauthorized", "The AI service rejected the server credentials.");
    case "configuration-error":
      return new GenerationError("service-unconfigured", "AI generation is not configured on the server.");
    case "provider-timeout":
    case "timeout":
      return new GenerationError("service-timeout", "AI generation timed out.");
    case "network-error":
      return new GenerationError("service-unavailable", "The AI service is unavailable.");
    case "provider-error":
      return new GenerationError("provider-error", "The AI provider failed.");
    case "malformed-provider-output":
    case "http-error":
      return new GenerationError("malformed-response", "The AI service returned an invalid response.");
  }
}

// ------------------------------------------------------------------- helpers

/** Same normalization rule as prisma/seed-data.ts `norm()`: lowercase, trim,
 *  collapse whitespace. Duplicate detection only — no semantic similarity. */
export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Content length caps — mirror the AI service's schema limits. */
const MAX_QUESTON_TEXT = 1000;
const MAX_OPTION_TEXT = 500;
const MAX_CODING_TITLE = 200;
const MAX_PROBLEM_STATEMENT = 4000;
const MAX_STARTER_CODE = 8000;
const MAX_CONSTRAINTS = 2000;
const MAX_TEST_IO = 2000;

const OPTION_COUNT = 4;

// ------------------------------------------------------------- MCQ validation

export type McqGenerationContext = {
  flow: AssessmentFlowValue;
  difficulty: DifficultyValue;
  count: number;
  /** Authoritative quota skill (A4); REQUIRED for BASIC_SKILLS_MCQ. */
  skillId: string | null;
  /** Authoritative area; REQUIRED for GENERAL. */
  areaId: string | null;
  /** Authoritative job title; REQUIRED for role-based flows. */
  jobTitleId: string | null;
  /**
   * Pre-fetched normalized library question texts for the same scope (the
   * Phase 3D engine already reads the pool — pass it in to skip the query).
   * When omitted, ONE bulk query is used (never one query per question).
   */
  existingNormalizedTexts?: string[];
};

export type ValidatedGeneratedMcq = {
  questionText: string;
  /** Positions 1..4 in service order — ready for buildSnapshot once ids are
   *  attached in Phase 3D. */
  options: { position: number; text: string; isCorrect: boolean }[];
  // Authoritative context (from the server, never from the AI):
  difficulty: DifficultyValue;
  flow: AssessmentFlowValue;
  skillId: string | null;
  areaId: string | null;
  jobTitleId: string | null;
};

export type McqRejectionReason =
  | "not-four-options"
  | "wrong-correct-count"
  | "empty-text"
  | "duplicate-option"
  | "invalid-difficulty"
  | "over-length"
  | "duplicate-in-batch"
  | "duplicate-in-library";

export type McqValidationResult =
  | {
      ok: true;
      questions: ValidatedGeneratedMcq[];
      rejected: { index: number; reason: McqRejectionReason }[];
    }
  | { ok: false; reason: "count-mismatch"; detail: string };

function assertMcqContext(ctx: McqGenerationContext): void {
  if (ctx.count < 1) {
    throw new GenerationError("validation-failure", "Generation count must be >= 1.");
  }
  if (ctx.flow === "GENERAL" && !ctx.areaId) {
    throw new GenerationError("validation-failure", "GENERAL flow requires an authoritative areaId.");
  }
  if (ctx.flow !== "GENERAL" && !ctx.jobTitleId) {
    throw new GenerationError("validation-failure", "Role-based flows require an authoritative jobTitleId.");
  }
  if (ctx.flow === "BASIC_SKILLS_MCQ" && !ctx.skillId) {
    throw new GenerationError("validation-failure", "BASIC_SKILLS_MCQ requires the authoritative quota skillId.");
  }
}

async function fetchExistingNormalizedMcqTexts(ctx: McqGenerationContext): Promise<string[]> {
  const rows = (await getPrisma().question.findMany({
    where: {
      status: "LIVE",
      assessmentFlow: ctx.flow,
      difficulty: ctx.difficulty,
      ...(ctx.flow === "GENERAL"
        ? { areas: { some: { areaOfInterestId: ctx.areaId } } }
        : { jobTitles: { some: { jobTitleId: ctx.jobTitleId } } }),
    },
    select: { questionText: true },
  })) as { questionText: string }[];
  return rows.map((r) => normalizeText(r.questionText));
}

/**
 * Validate a successful AI MCQ batch against the server-side context.
 * Never throws on item content (returns typed rejections); throws
 * GenerationError("validation-failure") only for invalid server context.
 */
export async function validateGeneratedMcq(
  items: GeneratedMcq[],
  ctx: McqGenerationContext,
): Promise<McqValidationResult> {
  assertMcqContext(ctx);

  if (items.length !== ctx.count) {
    return {
      ok: false,
      reason: "count-mismatch",
      detail: `Expected ${ctx.count} questions, received ${items.length}.`,
    };
  }

  // No generated questions -> nothing to compare; no DB access.
  const existingTexts =
    ctx.existingNormalizedTexts ??
    (items.length > 0 ? await fetchExistingNormalizedMcqTexts(ctx) : []);
  const existing = new Set(existingTexts);

  const questions: ValidatedGeneratedMcq[] = [];
  const rejected: { index: number; reason: McqRejectionReason }[] = [];
  const seenInBatch = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const reason = rejectMcqItem(item, ctx.difficulty, existing, seenInBatch);
    if (reason) {
      rejected.push({ index: i, reason });
      continue;
    }
    seenInBatch.add(normalizeText(item.question));
    questions.push({
      questionText: item.question,
      options: item.options.map((o, pos) => ({ position: pos + 1, text: o.text, isCorrect: o.isCorrect })),
      difficulty: ctx.difficulty,
      flow: ctx.flow,
      skillId: ctx.skillId,
      areaId: ctx.areaId,
      jobTitleId: ctx.jobTitleId,
    });
  }

  return { ok: true, questions, rejected };
}

function rejectMcqItem(
  item: GeneratedMcq,
  requestedDifficulty: DifficultyValue,
  existing: Set<string>,
  seenInBatch: Set<string>,
): McqRejectionReason | null {
  if (!item || !Array.isArray(item.options) || item.options.length !== OPTION_COUNT) {
    return "not-four-options";
  }
  if (item.options.filter((o) => o.isCorrect).length !== 1) return "wrong-correct-count";
  if (typeof item.question !== "string" || !item.question.trim()) return "empty-text";
  if (item.options.some((o) => typeof o.text !== "string" || !o.text.trim())) return "empty-text";
  const optionTexts = item.options.map((o) => normalizeText(o.text));
  if (new Set(optionTexts).size !== optionTexts.length) return "duplicate-option";
  if (item.difficulty !== requestedDifficulty) return "invalid-difficulty";
  if (item.question.length > MAX_QUESTON_TEXT) return "over-length";
  if (item.options.some((o) => o.text.length > MAX_OPTION_TEXT)) return "over-length";
  const key = normalizeText(item.question);
  if (seenInBatch.has(key)) return "duplicate-in-batch";
  if (existing.has(key)) return "duplicate-in-library";
  return null;
}

// ------------------------------------------------------------ coding validation

export type CodingGenerationContext = {
  difficulty: DifficultyValue;
  count: number;
  /** Requested language; must resolve in the Judge0 map (server-side list). */
  language: string;
  /** Authoritative job title; REQUIRED (coding questions are title-scoped). */
  jobTitleId: string | null;
  /** Pre-fetched normalized coding problem texts; see McqGenerationContext. */
  existingNormalizedTexts?: string[];
};

export type ValidatedGeneratedCoding = {
  title: string;
  problemStatement: string;
  /** Authoritative: the requested language, exactly as validated. */
  language: string;
  starterCode: string;
  constraints: string | null;
  testCases: { input: string; expectedOutput: string; visibility: "PUBLIC" | "HIDDEN" }[];
  difficulty: DifficultyValue;
  jobTitleId: string;
};

export type CodingRejectionReason =
  | "empty-text"
  | "invalid-language"
  | "invalid-difficulty"
  | "no-test-cases"
  | "missing-public-test"
  | "missing-hidden-test"
  | "duplicate-test-input"
  | "over-length"
  | "duplicate-in-batch"
  | "duplicate-in-library";

export type CodingValidationResult =
  | {
      ok: true;
      questions: ValidatedGeneratedCoding[];
      rejected: { index: number; reason: CodingRejectionReason }[];
    }
  | { ok: false; reason: "count-mismatch"; detail: string };

function assertCodingContext(ctx: CodingGenerationContext): void {
  if (ctx.count < 1) {
    throw new GenerationError("validation-failure", "Generation count must be >= 1.");
  }
  if (!ctx.jobTitleId) {
    throw new GenerationError("validation-failure", "Coding generation requires an authoritative jobTitleId.");
  }
  if (!resolveJudge0Language(ctx.language)) {
    throw new GenerationError(
      "validation-failure",
      `Unsupported coding language: ${ctx.language} (must be in the Judge0 language list).`,
    );
  }
}

async function fetchExistingNormalizedCodingTexts(ctx: CodingGenerationContext): Promise<string[]> {
  const rows = (await getPrisma().codingQuestion.findMany({
    where: {
      status: "LIVE",
      difficulty: ctx.difficulty,
      jobTitles: { some: { jobTitleId: ctx.jobTitleId } },
    },
    select: { problemStatement: true },
  })) as { problemStatement: string }[];
  return rows.map((r) => normalizeText(r.problemStatement));
}

/**
 * Validate a successful AI coding batch against the server-side context.
 * See validateGeneratedMcq for the error contract.
 */
export async function validateGeneratedCoding(
  items: GeneratedCoding[],
  ctx: CodingGenerationContext,
): Promise<CodingValidationResult> {
  assertCodingContext(ctx);

  if (items.length !== ctx.count) {
    return {
      ok: false,
      reason: "count-mismatch",
      detail: `Expected ${ctx.count} problems, received ${items.length}.`,
    };
  }

  const existingTexts =
    ctx.existingNormalizedTexts ??
    (items.length > 0 ? await fetchExistingNormalizedCodingTexts(ctx) : []);
  const existing = new Set(existingTexts);

  const requestedLanguage = ctx.language.trim().toLowerCase();
  const questions: ValidatedGeneratedCoding[] = [];
  const rejected: { index: number; reason: CodingRejectionReason }[] = [];
  const seenInBatch = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const reason = rejectCodingItem(item, ctx.difficulty, requestedLanguage, existing, seenInBatch);
    if (reason) {
      rejected.push({ index: i, reason });
      continue;
    }
    seenInBatch.add(normalizeText(item.problemStatement));
    questions.push({
      title: item.title,
      problemStatement: item.problemStatement,
      language: ctx.language, // authoritative, never the AI's spelling
      starterCode: item.starterCode,
      constraints: item.constraints,
      testCases: item.testCases.map((t) => ({
        input: t.input,
        expectedOutput: t.expectedOutput,
        visibility: t.visibility,
      })),
      difficulty: ctx.difficulty,
      jobTitleId: ctx.jobTitleId as string,
    });
  }

  return { ok: true, questions, rejected };
}

function rejectCodingItem(
  item: GeneratedCoding,
  requestedDifficulty: DifficultyValue,
  requestedLanguage: string,
  existing: Set<string>,
  seenInBatch: Set<string>,
): CodingRejectionReason | null {
  if (!item || typeof item.title !== "string" || !item.title.trim()) return "empty-text";
  if (typeof item.problemStatement !== "string" || !item.problemStatement.trim()) return "empty-text";
  if (typeof item.starterCode !== "string" || !item.starterCode.trim()) return "empty-text";
  if (typeof item.language !== "string" || item.language.trim().toLowerCase() !== requestedLanguage) {
    return "invalid-language";
  }
  if (item.difficulty !== requestedDifficulty) return "invalid-difficulty";
  if (!Array.isArray(item.testCases) || item.testCases.length === 0) return "no-test-cases";
  if (!item.testCases.some((t) => t.visibility === "PUBLIC")) return "missing-public-test";
  if (!item.testCases.some((t) => t.visibility === "HIDDEN")) return "missing-hidden-test";
  const inputs = item.testCases.map((t) => t.input);
  if (new Set(inputs).size !== inputs.length) return "duplicate-test-input";
  if (item.title.length > MAX_CODING_TITLE) return "over-length";
  if (item.problemStatement.length > MAX_PROBLEM_STATEMENT) return "over-length";
  if (item.starterCode.length > MAX_STARTER_CODE) return "over-length";
  if (item.constraints !== null && item.constraints.length > MAX_CONSTRAINTS) return "over-length";
  if (item.testCases.some((t) => t.input.length > MAX_TEST_IO || t.expectedOutput.length > MAX_TEST_IO)) {
    return "over-length";
  }
  const key = normalizeText(item.problemStatement);
  if (seenInBatch.has(key)) return "duplicate-in-batch";
  if (existing.has(key)) return "duplicate-in-library";
  return null;
}
