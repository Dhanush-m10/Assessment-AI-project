/**
 * Judge0 execution client — SERVER-ONLY. Credentials (JUDGE0_BASE_URL /
 * JUDGE0_API_KEY, both registered in docs/DECISIONS.md) never leave the
 * server: the browser talks exclusively to our Server Actions, which talk to
 * Judge0. Responses are normalized into safe, user-facing results; internal
 * details (tokens, raw API bodies, stack traces) are never forwarded.
 *
 * Each test case is executed as one Judge0 submission with wait=true
 * (synchronous result). Hosted deployments (e.g. the RapidAPI Judge0 CE
 * endpoint) may answer before the run finishes; in that case the client
 * falls back to BOUNDED polling of GET /submissions/{token} inside the same
 * overall 20s budget (fixed interval, hard poll cap — never infinite).
 * Every request is bounded by an AbortController.
 *
 * RapidAPI auth: X-RapidAPI-Key comes from JUDGE0_API_KEY and
 * X-RapidAPI-Host is derived from the JUDGE0_BASE_URL hostname, so the base
 * URL stays the single source of truth (no duplicate env var).
 *
 * Failure classification (C4.1) — every distinct cause keeps its own
 * reason instead of collapsing into "unavailable":
 *   not-configured     base URL missing, OR hosted RapidAPI URL without a key
 *   unsupported-language / code-too-large  (pre-flight, unchanged)
 *   unavailable        genuine network failure (DNS/TLS/connection)
 *   auth-failed        HTTP 401/403 (invalid key, invalid host,
 *                      subscription/quota problem)
 *   http-error         any other non-2xx (404 wrong endpoint, 405,
 *                      5xx gateway/queue)
 *   timeout            our 20s budget exhausted (incl. the wait=true
 *                      request aborted before the hosted side answered)
 *   malformed-response unexpected response shape
 * Each failure also logs ONE safe server-side diagnostic line (env presence
 * booleans, resolved host, secret-free URL, HTTP status, truncated response
 * preview, Judge0 status). Headers and request bodies are NEVER logged.
 */

import { judge0StatusLabel, resolveJudge0Language } from "@/lib/judge0/languages";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SOURCE_CHARS = 100_000;
const POLL_INTERVAL_MS = 1_500;
const MAX_POLLS = 12;
const FIELDS = "status,stdout,stderr,compile_output,time";

/** Non-terminal Judge0 statuses (1 In queue, 2 Processing). */
const NON_TERMINAL_STATUS_IDS: ReadonlySet<number> = new Set([1, 2]);

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
  | "auth-failed"
  | "http-error"
  | "timeout"
  | "malformed-response";

export type Judge0RunResult =
  | { ok: true; results: Judge0TestResult[] }
  | { ok: false; reason: Judge0Failure };

function config(): { baseUrl: string; host: string | null; apiKey: string | null } | null {
  const baseUrlRaw = process.env.JUDGE0_BASE_URL;
  if (!baseUrlRaw) return null;
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");
  let host: string | null = null;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    host = null; // malformed URL: the request fails later -> "unavailable"
  }
  return { baseUrl, host, apiKey: process.env.JUDGE0_API_KEY ?? null };
}

export function judge0Configured(): boolean {
  return config() !== null;
}

/** Judge0 CE and the RapidAPI deployment differ in auth header; send both
 *  accepted spellings — a deployment ignores the header it doesn't use.
 *  RapidAPI additionally requires X-RapidAPI-Host (derived, see header). */
function authHeaders(apiKey: string | null, host: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-Auth-Token"] = apiKey;
    if (host) headers["X-RapidAPI-Host"] = host;
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

type SubmissionBody = {
  status?: { id?: unknown };
  token?: unknown;
  stdout?: unknown;
  stderr?: unknown;
  compile_output?: unknown;
  time?: unknown;
};

/** Map a parsed submission body to the safe result shape (shared by the
 *  initial wait=true response and poll responses). */
function resultFromBody(
  body: SubmissionBody,
  test: Judge0TestInput,
): Judge0TestResult | { failure: Judge0Failure } {
  const status = body.status;
  if (typeof status?.id !== "number") return { failure: "malformed-response" };
  const stdout = fromBase64(body.stdout);
  const stderr = fromBase64(body.stderr) ?? fromBase64(body.compile_output);
  return {
    passed: status.id === 3 && outputsMatch(stdout, test.expectedOutput),
    statusLabel: judge0StatusLabel(status.id),
    stdout,
    stderr,
    timeSeconds: typeof body.time === "number" ? body.time : null,
  };
}

type FetchOutcome =
  | { ok: true; body: SubmissionBody }
  | { ok: false; failure: Judge0Failure; status?: number; bodyPreview?: string };

/**
 * One bounded Judge0 request with precise failure classification (C4.1).
 * - abort by OUR timer  -> "timeout" (the hosted side may still be running;
 *   this is not a network failure)
 * - fetch throw         -> "unavailable" (genuine network failure)
 * - 401/403             -> "auth-failed" (invalid key/host, subscription)
 * - other non-2xx       -> "http-error" (wrong endpoint, gateway, queue)
 * The truncated response preview (error bodies only) is returned for the
 * server diagnostic line; it never reaches the client.
 */
async function fetchSubmission(
  url: string,
  headers: Record<string, string>,
  init: { method: "POST"; body: string } | { method: "GET" },
  timeoutMs: number,
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(
      url,
      init.method === "POST"
        ? { method: "POST", headers, body: init.body, signal: controller.signal }
        : { method: "GET", headers, signal: controller.signal },
    );
  } catch {
    return { ok: false, failure: controller.signal.aborted ? "timeout" : "unavailable" };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let bodyPreview: string | undefined;
    try {
      // Error bodies only (RapidAPI/Judge0 error JSON — small, secret-free);
      // truncated so a pathological response can never bloat the log.
      bodyPreview = (await response.text()).slice(0, 300);
    } catch {
      bodyPreview = undefined;
    }
    return {
      ok: false,
      failure: response.status === 401 || response.status === 403 ? "auth-failed" : "http-error",
      status: response.status,
      bodyPreview,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, failure: "malformed-response" };
  }
  if (typeof body !== "object" || body === null) return { ok: false, failure: "malformed-response" };
  return { ok: true, body: body as SubmissionBody };
}

/**
 * Safe server-side diagnostic (C4.1) — identifies WHY execution failed
 * without leaking secrets or candidate code. Logs env PRESENCE booleans
 * (never values), the resolved host, the secret-free URL, HTTP status, a
 * truncated response preview and the Judge0 status. Request headers (which
 * carry the API key) and request bodies (which carry the candidate's
 * source) are NEVER logged.
 */
function diagnose(
  problem: string,
  detail: { url: string; status?: number; bodyPreview?: string; judge0Status?: number; polls?: number },
): void {
  const cfg = config();
  console.error(
    "[judge0] execution failed:",
    JSON.stringify({
      problem,
      baseUrlPresent: cfg !== null,
      apiKeyPresent: cfg?.apiKey !== null,
      host: cfg?.host ?? null,
      url: detail.url,
      httpStatus: detail.status ?? null,
      responsePreview: detail.bodyPreview ?? null,
      judge0Status:
        detail.judge0Status !== undefined
          ? { id: detail.judge0Status, label: judge0StatusLabel(detail.judge0Status) }
          : null,
      polls: detail.polls ?? 0,
    }),
  );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function executeOne(
  baseUrl: string,
  host: string | null,
  apiKey: string | null,
  languageId: number,
  sourceCode: string,
  test: Judge0TestInput,
): Promise<Judge0TestResult | { failure: Judge0Failure }> {
  const headers = authHeaders(apiKey, host);
  // One shared 20s budget for the whole test case (initial request + any
  // bounded polling) — the existing worst-case bound, preserved.
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const startedAt = Date.now();
  const postUrl = `${baseUrl}/submissions?base64_encoded=true&wait=true&fields=${FIELDS}`;

  const first = await fetchSubmission(
    postUrl,
    headers,
    {
      method: "POST",
      body: JSON.stringify({
        language_id: languageId,
        source_code: toBase64(sourceCode),
        stdin: toBase64(test.input),
        expected_output: toBase64(test.expectedOutput),
      }),
    },
    REQUEST_TIMEOUT_MS,
  );
  if (!first.ok) {
    diagnose("submission request failed", {
      url: postUrl,
      status: first.status,
      bodyPreview: first.bodyPreview,
    });
    return { failure: first.failure };
  }

  const firstStatus = first.body.status?.id;
  if (typeof firstStatus !== "number" || !NON_TERMINAL_STATUS_IDS.has(firstStatus)) {
    const result = resultFromBody(first.body, test);
    if (!("failure" in result) && typeof firstStatus === "number") {
      console.info(
        "[judge0] submission ok:",
        JSON.stringify({ judge0Status: judge0StatusLabel(firstStatus), polls: 0, elapsedMs: Date.now() - startedAt }),
      );
    }
    return result;
  }

  // Hosted endpoint answered before the run finished (its wait window is
  // shorter than ours). Without a token there is nothing to track — report
  // the controlled timeout instead of a fake "In queue" result.
  if (typeof first.body.token !== "string" || first.body.token.length === 0) {
    diagnose("hosted endpoint returned a non-terminal status without a token (nothing to poll)", {
      url: postUrl,
      judge0Status: firstStatus,
    });
    return { failure: "timeout" };
  }

  const pollUrl = `${baseUrl}/submissions/${encodeURIComponent(first.body.token)}?base64_encoded=true&fields=${FIELDS}`;
  for (let i = 0; i < MAX_POLLS; i++) {
    if (deadline - Date.now() <= POLL_INTERVAL_MS) break;
    await sleep(POLL_INTERVAL_MS);
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const next = await fetchSubmission(pollUrl, headers, { method: "GET" }, Math.min(remaining, REQUEST_TIMEOUT_MS));
    if (!next.ok) {
      diagnose(`poll ${i + 1} of ${MAX_POLLS} failed`, {
        url: pollUrl,
        status: next.status,
        bodyPreview: next.bodyPreview,
        polls: i + 1,
      });
      return { failure: next.failure };
    }

    const status = next.body.status?.id;
    if (typeof status === "number" && !NON_TERMINAL_STATUS_IDS.has(status)) {
      const result = resultFromBody(next.body, test);
      if (!("failure" in result)) {
        console.info(
          "[judge0] submission ok:",
          JSON.stringify({ judge0Status: judge0StatusLabel(status), polls: i + 1, elapsedMs: Date.now() - startedAt }),
        );
      }
      return result;
    }
  }
  diagnose("bounded polling budget exhausted (no terminal status within the 20s budget)", {
    url: pollUrl,
    polls: MAX_POLLS,
  });
  return { failure: "timeout" };
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
  // A hosted RapidAPI endpoint always requires the key — fail fast with the
  // controlled not-configured state instead of a guaranteed 401/403 round
  // trip (diagnostic: apiKeyPresent=false, host=*.rapidapi.com).
  if (!cfg.apiKey && cfg.host?.includes("rapidapi.com")) {
    return { ok: false, reason: "not-configured" };
  }

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
    const outcome = await executeOne(cfg.baseUrl, cfg.host, cfg.apiKey, resolved.id, sourceCode, test);
    if ("failure" in outcome) return { ok: false, reason: outcome.failure };
    results.push(outcome);
  }
  return { ok: true, results };
}
