/**
 * Judge0 execution client — SERVER-ONLY. Credentials (JUDGE0_BASE_URL /
 * JUDGE0_API_KEY, both registered in docs/DECISIONS.md) never leave the
 * server: the browser talks exclusively to our Server Actions, which talk to
 * Judge0. Responses are normalized into safe, user-facing results; internal
 * details (tokens, raw API bodies, stack traces) are never forwarded.
 *
 * Each test case is executed as one Judge0 submission with wait=true
 * (synchronous result), which keeps the flow simple and avoids polling
 * infrastructure. A hard AbortController timeout bounds every request.
 */

import { judge0StatusLabel, resolveJudge0Language } from "@/lib/judge0/languages";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SOURCE_CHARS = 100_000;

export type Judge0TestInput = {
  input: string;
  expectedOutput: string;
};

export type Judge0TestResult = {
  passed: boolean;
  statusLabel: string;
  /** The candidate's own program output — safe to echo back. */
  stdout: string | null;
  /** Compilation/runtime message from the candidate's code — safe to echo. */
  stderr: string | null;
  timeSeconds: number | null;
};

export type Judge0Failure =
  | "not-configured"
  | "unsupported-language"
  | "code-too-large"
  | "unavailable"
  | "timeout"
  | "malformed-response";

export type Judge0RunResult =
  | { ok: true; results: Judge0TestResult[] }
  | { ok: false; reason: Judge0Failure };

function config(): { baseUrl: string; apiKey: string | null } | null {
  const baseUrl = process.env.JUDGE0_BASE_URL;
  if (!baseUrl) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey: process.env.JUDGE0_API_KEY ?? null };
}

export function judge0Configured(): boolean {
  return config() !== null;
}

/** Judge0 CE and the RapidAPI deployment differ in auth header; send both
 *  accepted spellings — a deployment ignores the header it doesn't use. */
function authHeaders(apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-Auth-Token"] = apiKey;
  }
  return headers;
}

function toBase64(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64");
}

function fromBase64(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/** Output comparison: normalize CRLF and ignore trailing whitespace, which
 *  is the standard Judge0/competitive-programming convention. */
function outputsMatch(actual: string | null, expected: string): boolean {
  if (actual === null) return false;
  const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/[ \t\n]+$/g, "").trimEnd();
  return norm(actual) === norm(expected);
}

async function executeOne(
  baseUrl: string,
  apiKey: string | null,
  languageId: number,
  sourceCode: string,
  test: Judge0TestInput,
): Promise<Judge0TestResult | { failure: Judge0Failure }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/submissions?base64_encoded=true&wait=true&fields=status,stdout,stderr,compile_output,time`,
      {
        method: "POST",
        headers: authHeaders(apiKey),
        body: JSON.stringify({
          language_id: languageId,
          source_code: toBase64(sourceCode),
          stdin: toBase64(test.input),
          expected_output: toBase64(test.expectedOutput),
        }),
        signal: controller.signal,
      },
    );
  } catch {
    return { failure: "unavailable" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) return { failure: "unavailable" };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { failure: "malformed-response" };
  }
  const status = (body as { status?: { id?: unknown } })?.status;
  if (typeof status?.id !== "number") return { failure: "malformed-response" };
  const raw = body as {
    stdout?: unknown;
    stderr?: unknown;
    compile_output?: unknown;
    time?: unknown;
  };

  const stdout = fromBase64(raw.stdout);
  const stderr = fromBase64(raw.stderr) ?? fromBase64(raw.compile_output);
  return {
    passed: status.id === 3 && outputsMatch(stdout, test.expectedOutput),
    statusLabel: judge0StatusLabel(status.id),
    stdout,
    stderr,
    timeSeconds: typeof raw.time === "number" ? raw.time : null,
  };
}

/**
 * Execute the candidate's code against a list of test cases, sequentially.
 * The caller (lib/assessment/coding.ts) decides which tests may be run:
 * Run Code passes PUBLIC tests only, Submit passes all tests server-side.
 */
export async function executeTests(
  language: string,
  sourceCode: string,
  tests: Judge0TestInput[],
): Promise<Judge0RunResult> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: "not-configured" };

  const resolved = resolveJudge0Language(language);
  if (!resolved) return { ok: false, reason: "unsupported-language" };

  if (sourceCode.length > MAX_SOURCE_CHARS) return { ok: false, reason: "code-too-large" };
  if (sourceCode.trim().length === 0) {
    return {
      ok: true,
      results: tests.map(() => ({
        passed: false,
        statusLabel: "No code submitted",
        stdout: null,
        stderr: null,
        timeSeconds: null,
      })),
    };
  }

  const results: Judge0TestResult[] = [];
  for (const test of tests) {
    const outcome = await executeOne(cfg.baseUrl, cfg.apiKey, resolved.id, sourceCode, test);
    if ("failure" in outcome) return { ok: false, reason: outcome.failure };
    results.push(outcome);
  }
  return { ok: true, results };
}
