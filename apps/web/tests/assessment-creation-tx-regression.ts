/**
 * Regression — assessment creation vs. Prisma transaction scope.
 *
 * Background: a production run hit P2028 ("Transaction already closed",
 * 5000 ms budget) while persisting AI gap-fill DRAFT anchors. This test pins
 * the two architectural guarantees of `createAssessment`:
 *
 *   1. The AI (Gemini) generation call happens with NO interactive Prisma
 *      transaction open — generation is a network call and must never hold
 *      the transaction (Prisma's interactive tx budget is 5 s).
 *   2. The persistence transaction stays SHORT: its writes are dispatched
 *      in a bounded number of sequential database round-trips, independent
 *      of how many AI anchors are persisted. Simulated per-query latency is
 *      300 ms; the transaction wall time must stay under 1 s (a 7-query
 *      sequential chain would take >= 2.1 s and fail).
 *
 * Scenarios (fake Prisma via the globalThis.prisma seam, fake AI client via
 * setGenerationClientForTests — no database, no network):
 *   S1  GENERAL, empty library pool, count 5  -> 5 AI anchors persisted.
 *       Asserts guarantees 1 + 2, the aiFailure-free success path, and the
 *       DRAFT anchor / AI_GENERATED source invariants.
 *   S2  Same, but the AI client fails          -> the f1e5d0f behavior is
 *       preserved: controlled `insufficient` result carrying the ACTUAL
 *       failure message, and ZERO database writes.
 *   S3  Sufficient library pool (5/5)          -> library-first rule intact:
 *       the AI client is NEVER called, all rows are QUESTION_LIBRARY.
 *
 * Run from apps/web (tsx only — the `--conditions=react-server` flag lets
 * Node resolve the `server-only` import to its empty export outside a Next
 * server context; nothing in this chain imports React):
 *
 *   cd apps/web
 *   NODE_OPTIONS="--conditions=react-server" npx tsx tests/assessment-creation-tx-regression.ts
 *
 * Exit code 0 = all checks pass.
 */

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  createAssessment,
  type CreateResult,
} from "@/lib/assessment/engine";
import { setGenerationClientForTests } from "@/lib/assessment/ai-gapfill";
import {
  AiServiceError,
  type GeneratedMcq,
  type generateCoding,
  type generateMcq,
} from "@/lib/ai-service/client";

const TX_QUERY_DELAY_MS = 300; // simulated remote-DB round trip
const TX_WALL_BUDGET_MS = 1000; // must stay far under Prisma's 5000 ms
const AI_SIMULATED_LATENCY_MS = 50;

// ------------------------------------------------------------------ fakes

type PoolRow = {
  id: string;
  difficulty: string;
  questionText: string;
  options: { id: string; position: number; text: string; isCorrect: boolean }[];
  skills: { skillId: string }[];
};

type TxWriteRecord = {
  questionText: string;
  status: string;
  optionCount: number;
};

type AqRowRecord = {
  source: string;
  libraryQuestionId: string | null;
  skillId: string | null;
};

type FakeState = {
  inTx: boolean;
  txWallMs: number | null;
  maxConcurrentInTx: number;
  txQueryCount: number;
  assessmentCreates: number;
  questionCreates: TxWriteRecord[];
  aqRows: AqRowRecord[];
  skillBatchCount: number;
};

type AiCallRecord = {
  inTx: boolean;
  count: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeFakeDb(pool: PoolRow[]): FakeState & { client: PrismaClient } {
  const state: FakeState = {
    inTx: false,
    txWallMs: null,
    maxConcurrentInTx: 0,
    txQueryCount: 0,
    assessmentCreates: 0,
    questionCreates: [],
    aqRows: [],
    skillBatchCount: 0,
  };

  const raw = {
    // -- autocommit reads (outside any transaction) --------------------
    assessment: {
      findUnique: async () => null, // no idempotent replay in these scenarios
    },
    areaOfInterest: {
      findFirst: async () => ({
        id: "area-1",
        categoryId: "cat-1",
        name: "Aptitude",
      }),
    },
    question: {
      // Used both by the engine's pool selector and by the AI validator's
      // duplicate check; both get the same (scenario-specific) pool.
      findMany: async () => pool,
    },
    // -- interactive transaction (the unit under test) -----------------
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      state.inTx = true;
      state.txWallMs = null;
      state.maxConcurrentInTx = 0;
      state.txQueryCount = 0;
      let active = 0;
      const tracked = (impl: (...args: unknown[]) => Promise<unknown>) =>
        async (...args: unknown[]) => {
          active += 1;
          state.txQueryCount += 1;
          if (active > state.maxConcurrentInTx) state.maxConcurrentInTx = active;
          await sleep(TX_QUERY_DELAY_MS);
          active -= 1;
          return impl(...args);
        };
      const tx = {
        assessment: {
          create: tracked(async () => {
            state.assessmentCreates += 1;
            return { id: "assess-1" };
          }),
        },
        question: {
          create: tracked(async (arg) => {
            const data = (arg as { data: { questionText: string; status: string; options: { create: unknown[] } } }).data;
            state.questionCreates.push({
              questionText: data.questionText,
              status: data.status,
              optionCount: data.options.create.length,
            });
            return {};
          }),
        },
        assessmentQuestion: {
          createMany: tracked(async (arg) => {
            const data = (arg as {
              data: { source: string; libraryQuestionId: string | null; skillId: string | null }[];
            }).data;
            for (const row of data) {
              state.aqRows.push({
                source: row.source,
                libraryQuestionId: row.libraryQuestionId,
                skillId: row.skillId,
              });
            }
            return { count: data.length };
          }),
        },
        assessmentSkill: {
          createMany: tracked(async () => {
            state.skillBatchCount += 1;
            return { count: 0 };
          }),
        },
      };
      const start = Date.now();
      try {
        return await fn(tx);
      } finally {
        state.inTx = false;
        state.txWallMs = Date.now() - start;
      }
    },
  };
  // Object.assign (not a spread) so the SAME state object is mutated by the
  // client's closures and observed by the assertions.
  return Object.assign(state, {
    client: raw as unknown as PrismaClient,
  }) as FakeState & { client: PrismaClient };
}

function installFakeDb(pool: PoolRow[]): FakeState & { client: PrismaClient } {
  const fake = makeFakeDb(pool);
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = fake.client;
  // Sanity: the seam really is the fake.
  if (getPrisma() !== fake.client) {
    throw new Error("test setup: globalThis.prisma seam was not installed");
  }
  return fake;
}

const libraryPool = (n: number): PoolRow[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `lib-${i + 1}`,
    difficulty: "EASY",
    questionText: `Library question ${i + 1} for the regression suite`,
    options: [
      { id: `lib-${i + 1}-a`, position: 1, text: `Library option A ${i + 1}`, isCorrect: true },
      { id: `lib-${i + 1}-b`, position: 2, text: `Library option B ${i + 1}`, isCorrect: false },
      { id: `lib-${i + 1}-c`, position: 3, text: `Library option C ${i + 1}`, isCorrect: false },
      { id: `lib-${i + 1}-d`, position: 4, text: `Library option D ${i + 1}`, isCorrect: false },
    ],
    skills: [],
  }));

const aiItems = (n: number): GeneratedMcq[] =>
  Array.from({ length: n }, (_, i) => ({
    question: `Generated question ${i + 1} for the regression suite`,
    options: [
      { text: `Generated option A ${i + 1}`, isCorrect: true },
      { text: `Generated option B ${i + 1}`, isCorrect: false },
      { text: `Generated option C ${i + 1}`, isCorrect: false },
      { text: `Generated option D ${i + 1}`, isCorrect: false },
    ],
    difficulty: "EASY",
  }));

type AiBehavior =
  | { kind: "ok" }
  | { kind: "fail"; error: AiServiceError };

function installFakeAiClient(state: FakeState, aiCalls: AiCallRecord[], behavior: AiBehavior) {
  const generateMcqFake = async (
    request: Parameters<typeof generateMcq>[0],
  ): Promise<GeneratedMcq[]> => {
    aiCalls.push({ inTx: state.inTx, count: request.count });
    await sleep(AI_SIMULATED_LATENCY_MS);
    if (behavior.kind === "fail") throw behavior.error;
    return aiItems(request.count);
  };
  const generateCodingFake = (async () => {
    throw new Error("regression suite: coding generation is not exercised here");
  }) as typeof generateCoding;
  setGenerationClientForTests({
    generateMcq: generateMcqFake as typeof generateMcq,
    generateCoding: generateCodingFake,
  });
}

// ------------------------------------------------------------------ driver

type ScenarioResult = {
  result: CreateResult;
  state: FakeState;
  aiCalls: AiCallRecord[];
};

async function runScenario(pool: PoolRow[], behavior: AiBehavior): Promise<ScenarioResult> {
  const state = installFakeDb(pool);
  const aiCalls: AiCallRecord[] = [];
  installFakeAiClient(state, aiCalls, behavior);
  const result = await createAssessment({
    userId: "user-1",
    clientRequestId: crypto.randomUUID(),
    flow: "GENERAL",
    categoryId: "cat-1",
    areaId: "area-1",
    jobTitleId: null,
    difficulty: "EASY",
    experienceBand: null,
    count: 5,
    previewEnabled: false,
    jd: null,
    selection: {
      userId: "user-1",
      flow: "GENERAL",
      difficulty: "EASY",
      areaId: "area-1",
    },
  });
  setGenerationClientForTests(null);
  return { result, state, aiCalls };
}

let failures = 0;
function check(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? `  [${detail}]` : ""}`);
  }
}

// ------------------------------------------------------------------ S1

async function scenario1(): Promise<void> {
  console.log("S1: GENERAL / EASY / 5 requested, empty library pool -> 5 AI gap-fill anchors");
  const { result, state, aiCalls } = await runScenario([], { kind: "ok" });

  check("exactly ONE AI generation request was made", aiCalls.length === 1, `calls=${aiCalls.length}`);
  check(
    "AI generation ran with NO interactive transaction open",
    aiCalls.length === 1 && aiCalls[0].inTx === false,
    `inTx=${aiCalls[0]?.inTx}`,
  );
  check(
    `persistence transaction stayed short (< ${TX_WALL_BUDGET_MS} ms at ${TX_QUERY_DELAY_MS} ms/query)`,
    state.txWallMs !== null && state.txWallMs < TX_WALL_BUDGET_MS,
    `txWallMs=${state.txWallMs}`,
  );
  check(
    "transaction writes were dispatched non-sequentially (max concurrency >= 2)",
    state.maxConcurrentInTx >= 2,
    `maxConcurrentInTx=${state.maxConcurrentInTx}`,
  );
  check(
    "all expected writes reached the transaction (assessment + 5 anchors + 5 snapshot rows)",
    state.txQueryCount === 7 && state.assessmentCreates === 1,
    `txQueryCount=${state.txQueryCount}, assessmentCreates=${state.assessmentCreates}`,
  );
  console.log(
    `  info  measured transaction: wall=${state.txWallMs} ms, ` +
      `queries=${state.txQueryCount}, maxConcurrent=${state.maxConcurrentInTx}`,
  );
  check(
    "result is ok (IN_PROGRESS, preview off)",
    result.ok === true && result.status === "IN_PROGRESS",
    JSON.stringify(result),
  );
  check(
    "5 DRAFT Question anchors persisted with 4 options each",
    state.questionCreates.length === 5 &&
      state.questionCreates.every((q) => q.status === "DRAFT" && q.optionCount === 4),
    JSON.stringify(state.questionCreates),
  );
  check(
    "all 5 AssessmentQuestion rows are source=AI_GENERATED with libraryQuestionId=null",
    state.aqRows.length === 5 &&
      state.aqRows.every((r) => r.source === "AI_GENERATED" && r.libraryQuestionId === null),
    JSON.stringify(state.aqRows),
  );
}

// ------------------------------------------------------------------ S2

async function scenario2(): Promise<void> {
  console.log("S2: same shape, AI generation fails -> controlled aiFailure, zero writes");
  const providerMessage = "The question generator failed. Please try again.";
  const { result, state, aiCalls } = await runScenario([], {
    kind: "fail",
    error: new AiServiceError("provider-error", providerMessage),
  });

  check(
    "result is the controlled insufficient state",
    result.ok === false && result.reason === "insufficient" && result.available === 0,
    JSON.stringify(result),
  );
  check(
    "the ACTUAL AI failure message is surfaced (f1e5d0f behavior)",
    !result.ok && result.reason === "insufficient" && result.aiFailure === providerMessage,
    `aiFailure=${result.ok === false && result.reason === "insufficient" ? result.aiFailure : "<n/a>"}`,
  );
  check(
    "the AI call (that failed) ran with NO transaction open",
    aiCalls.length === 1 && aiCalls[0].inTx === false,
    `inTx=${aiCalls[0]?.inTx}`,
  );
  check(
    "nothing was persisted (no assessment, no anchors, no snapshot rows)",
    state.assessmentCreates === 0 &&
      state.questionCreates.length === 0 &&
      state.aqRows.length === 0,
    JSON.stringify({
      assessmentCreates: state.assessmentCreates,
      anchors: state.questionCreates.length,
      aqRows: state.aqRows.length,
    }),
  );
  check("no transaction is left open", state.inTx === false);
}

// ------------------------------------------------------------------ S3

async function scenario3(): Promise<void> {
  console.log("S3: sufficient library pool (5/5) -> library-first, AI never called");
  const { result, state, aiCalls } = await runScenario(libraryPool(5), { kind: "ok" });

  check("the AI client was NEVER called", aiCalls.length === 0, `calls=${aiCalls.length}`);
  check("result is ok", result.ok === true, JSON.stringify(result));
  check(
    "all 5 rows are QUESTION_LIBRARY with their library ids",
    state.aqRows.length === 5 &&
      state.aqRows.every((r) => r.source === "QUESTION_LIBRARY" && r.libraryQuestionId !== null),
    JSON.stringify(state.aqRows),
  );
  check("no DRAFT anchors were created", state.questionCreates.length === 0);
}

// ------------------------------------------------------------------ main

async function main(): Promise<void> {
  console.log(
    `assessment-creation-tx-regression (simulated DB latency ${TX_QUERY_DELAY_MS} ms/query)\n`,
  );
  await scenario1();
  await scenario2();
  await scenario3();
  console.log(
    failures === 0
      ? "\nRESULT: ALL CHECKS PASSED"
      : `\nRESULT: ${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
