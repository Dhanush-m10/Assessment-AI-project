import "server-only";

import type { AssessmentFlowValue, DifficultyValue } from "@/lib/assessment/limits";

/**
 * Server-only client for the AI service (apps/ai-service).
 *
 * Security/flow contract:
 *  - Server-side only: the `server-only` marker makes any client-component
 *    import a build error; the browser never talks to the AI service.
 *  - The shared secret comes from server-side env (AI_SERVICE_SHARED_SECRET)
 *    and is sent ONLY as the X-AI-Service-Secret header. It is never logged,
 *    never echoed in errors, and never exposed to the client.
 *  - One request per generation batch; V1 does NOT retry.
 *
 * Errors: every failure is a typed `AiServiceError` with a safe code and a
 * fixed message. Provider details, stack traces and secrets never surface.
 */

// Exceeds the AI service's own provider timeout (60s) so a service 504 is
// observable instead of racing our own abort.
export const DEFAULT_REQUEST_TIMEOUT_MS = 75_000;

// --------------------------------------------------------------------- types

export type McqGenerationRequest = {
  flow: AssessmentFlowValue;
  difficulty: DifficultyValue;
  count: number;
  /** Prompt context (display name), not a database ID. */
  skill?: string;
  jobTitle?: string;
  area?: string;
};

export type CodingGenerationRequest = {
  flow: "CODING";
  difficulty: DifficultyValue;
  count: number;
  skill?: string;
  jobTitle?: string;
  language: string;
};

/** MCQ as returned by the service (snake_case JSON mapped to camelCase). */
export type GeneratedMcq = {
  question: string;
  options: { text: string; isCorrect: boolean }[];
  difficulty: DifficultyValue;
};

export type GeneratedCodingTestCase = {
  input: string;
  expectedOutput: string;
  visibility: "PUBLIC" | "HIDDEN";
};

export type GeneratedCoding = {
  title: string;
  problemStatement: string;
  language: string;
  starterCode: string;
  constraints: string | null;
  testCases: GeneratedCodingTestCase[];
  difficulty: DifficultyValue;
};

export type AiServiceErrorCode =
  | "unauthorized" // 401: missing/wrong shared secret
  | "configuration-error" // 503: service (or this side) not configured
  | "provider-timeout" // 504: the service's provider call timed out
  | "provider-error" // 502: provider failure
  | "malformed-provider-output" // 502: provider output failed service validation
  | "timeout" // our own bounded request timeout (AbortController)
  | "network-error" // unreachable service (DNS/refused/connection error)
  | "http-error"; // any other unexpected HTTP status or unparseable envelope

/** Typed, safe error: code + fixed message. No secrets, no provider detail. */
export class AiServiceError extends Error {
  constructor(
    readonly code: AiServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

type ClientOptions = {
  /** Bounded request timeout; defaults to DEFAULT_REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
};

// -------------------------------------------------------------------- internals

function readConfig(): { baseUrl: string; secret: string } {
  const baseUrl = (process.env.AI_SERVICE_URL ?? "").trim().replace(/\/+$/, "");
  const secret = (process.env.AI_SERVICE_SHARED_SECRET ?? "").trim();
  if (!baseUrl || !secret) {
    throw new AiServiceError(
      "configuration-error",
      "AI generation is not configured on the server. Please contact the administrator.",
    );
  }
  return { baseUrl, secret };
}

/** Map the service's snake_case item shapes to camelCase. Returns the raw
 *  parsed questions array; callers re-validate everything deterministically. */
function mapMcq(raw: unknown): GeneratedMcq[] {
  const arr = raw as Record<string, unknown>[];
  return arr.map((q) => ({
    question: q.question,
    options: (q.options as Record<string, unknown>[]).map((o) => ({
      text: o.text,
      isCorrect: o.is_correct,
    })),
    difficulty: q.difficulty,
  })) as GeneratedMcq[];
}

function mapCoding(raw: unknown): GeneratedCoding[] {
  const arr = raw as Record<string, unknown>[];
  return arr.map((q) => ({
    title: q.title,
    problemStatement: q.problem_statement,
    language: q.language,
    starterCode: q.starter_code,
    constraints: (q.constraints ?? null) as string | null,
    testCases: (q.test_cases as Record<string, unknown>[]).map((t) => ({
      input: t.input,
      expectedOutput: t.expected_output,
      visibility: t.visibility,
    })),
    difficulty: q.difficulty,
  })) as GeneratedCoding[];
}

type Envelope = { error?: unknown; message?: unknown };

function envelopeCode(body: unknown): string | null {
  if (typeof body === "object" && body !== null) {
    const code = (body as Envelope).error;
    if (typeof code === "string") return code;
  }
  return null;
}

async function post<T>(
  path: string,
  body: unknown,
  map: (raw: unknown) => T,
  options: ClientOptions,
): Promise<T> {
  const { baseUrl, secret } = readConfig();
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AI-Service-Secret": secret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new AiServiceError("timeout", "The question generator timed out. Please try again.");
    }
    throw new AiServiceError("network-error", "The question generation service is unavailable. Please try again later.");
  } finally {
    clearTimeout(timer);
  }

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (response.ok) {
    const obj = parsed as { questions?: unknown } | null;
    if (!obj || !Array.isArray(obj.questions)) {
      throw new AiServiceError(
        "malformed-provider-output",
        "The question generator returned an invalid question set. Please try again.",
      );
    }
    return map(obj.questions);
  }

  // Non-2xx: use the controlled envelope when present; never echo the body.
  const code = envelopeCode(parsed);
  if (response.status === 401 || code === "unauthorized") {
    throw new AiServiceError("unauthorized", "AI generation is not authorized on the server. Please contact the administrator.");
  }
  if (response.status === 503 || code === "configuration-error") {
    throw new AiServiceError("configuration-error", "AI generation is not configured on the server. Please contact the administrator.");
  }
  if (response.status === 504 || code === "provider-timeout") {
    throw new AiServiceError("provider-timeout", "The question generator timed out. Please try again.");
  }
  if (code === "malformed-provider-output") {
    throw new AiServiceError("malformed-provider-output", "The question generator returned an invalid question set. Please try again.");
  }
  if (code === "provider-error" || response.status === 502) {
    throw new AiServiceError("provider-error", "The question generator failed. Please try again.");
  }
  throw new AiServiceError("http-error", "The question generation service returned an unexpected error. Please try again later.");
}

// ------------------------------------------------------------------- public API

const toMcqWire = (r: McqGenerationRequest) => ({
  flow: r.flow,
  difficulty: r.difficulty,
  count: r.count,
  skill: r.skill ?? null,
  job_title: r.jobTitle ?? null,
  area: r.area ?? null,
});

const toCodingWire = (r: CodingGenerationRequest) => ({
  flow: r.flow,
  difficulty: r.difficulty,
  count: r.count,
  skill: r.skill ?? null,
  job_title: r.jobTitle ?? null,
  language: r.language,
});

/** Generate a batch of MCQs from the AI service (one request, no retries). */
export function generateMcq(
  request: McqGenerationRequest,
  options: ClientOptions = {},
): Promise<GeneratedMcq[]> {
  return post("/generate-mcq", toMcqWire(request), mapMcq, options);
}

/** Generate a batch of coding challenges (one request, no retries). */
export function generateCoding(
  request: CodingGenerationRequest,
  options: ClientOptions = {},
): Promise<GeneratedCoding[]> {
  return post("/generate-coding", toCodingWire(request), mapCoding, options);
}
