/**
 * Regression — createAssessment persistence vs Prisma's interactive
 * transaction budget (production P2028).
 *
 * Background: with 5 AI gap-fill anchors the old persistence path issued
 * 7 SEQUENTIAL round-trips on the transaction connection (assessment.create,
 * then one nested question.create PER AI question, then the snapshot rows).
 * Production measured 5124 ms and hit Prisma's 5000 ms interactive-
 * transaction budget (P2028). A `Promise.all` around the writes does NOT
 * help: Prisma serializes every query on the interactive transaction's
 * single connection. This test therefore models REAL Prisma semantics:
 *
 *   * the $transaction callback runs on ONE connection; every tx query is
 *     serialized (queued strictly one-at-a-time — no concurrency exists),
 *   * each query costs  RTT (600 ms, remote Supabase class) +
 *     40 ms per INSERT statement, where a bulk createMany is ONE multi-row
 *     INSERT and a nested create expands to one INSERT per child,
 *   * a throw inside the callback rolls back EVERY buffered write.
 *
 * The persistence strategy under test must keep the measured transaction
 * wall time UNDER the 5000 ms budget with this model while writing:
 *
 *   S1  GENERAL / EASY / 5 requested, empty library pool -> 5 AI anchors.
 *       Round-trips must be minimal bulk writes: 1 assessment.create with
 *       the AssessmentQuestion rows nested, then one createMany per anchor
 *       model. Invariants: 5 DRAFT Question rows (pre-generated ids), 20
 *       QuestionOption rows with the exact ids/positions/text/isCorrect the
 *       snapshots embed, QuestionArea links, 5 AI_GENERATED rows with
 *       libraryQuestionId=null, snapshot option ids resolve to real option
 *       rows, NO UserQuestionHistory writes, selection queried LIVE only,
 *       AI generation ran with no transaction open.
 *   S2  AI generation fails -> f1e5d0f behavior: controlled `insufficient`
 *       result with the ACTUAL message, zero writes.
 *   S3  Sufficient library pool -> library-first: AI never called, single
 *       round-trip, all QUESTION_LIBRARY.
 *   S4  BASIC_SKILLS_MCQ (2 skills, 3 library + 2 AI gaps): AssessmentSkill
 *       rows (sources preserved), per-quota skill attribution, all three
 *       join models (area + job title + skill), wall time under budget.
 *   S5  Rollback atomicity: a DB failure mid-transaction leaves ZERO
 *       persisted rows (no orphan DRAFT anchors, no partial rows).
 *   S6  CODING flow (2 AI, no anchors): everything in ONE round-trip.
 *
 * Run from apps/web (the `--conditions=react-server` flag lets Node resolve
 * the `server-only` import to its empty export outside a Next server
 * context; nothing in this chain imports React):
 *
 *   cd apps/web
 *   NODE_OPTIONS="--conditions=react-server" npx tsx tests/assessment-creation-tx-regression.ts
 *
 * Exit code 0 = all checks pass.
 */

import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { createAssessment, type CreateResult } from "@/lib/assessment/engine";
import { setGenerationClientForTests } from "@/lib/assessment/ai-gapfill";
import {
  AiServiceError,
  type GeneratedCoding,
  type GeneratedMcq,
  type generateCoding,
  type generateMcq,
} from "@/lib/ai-service/client";

// ------------------------------------------------- real-Prisma cost model
const PRISMA_TX_BUDGET_MS = 5000; // Prisma's interactive-transaction timeout
const RTT_MS = 600; // one remote round-trip on the transaction connection
const STMT_MS = 40; // server-side cost per INSERT statement
const AI_SIMULATED_LATENCY_MS = 50;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------- fake types

type PoolOption = { id: string; position: number; text: string; isCorrect: boolean };
type PoolRow = {
  id: string;
  difficulty: string;
  questionText: string;
  options: PoolOption[];
  skills: { skillId: string }[];
};

type AqNestedRow = {
  sequence: number;
  source: string;
  libraryQuestionId: string | null;
  codingQuestionId: string | null;
  skillId: string | null;
  questionSnapshot: {
    v: number;
    questionText: string;
    options: { id: string; position: number; text: string }[];
    correctOptionId: string;
    difficulty?: string;
  };
};

type SkillNestedRow = { skillId: string; sources: string[] };
type AnchorRow = {
  id: string;
  questionText: string;
  difficulty: string;
  assessmentFlow: string;
  status: string;
};
type OptionRow = {
  id: string;
  questionId: string;
  position: number;
  text: string;
  isCorrect: boolean;
};
type LinkRow = { questionId: string; areaOfInterestId?: string; jobTitleId?: string; skillId?: string };

type WriteRecord = { model: string; rows: unknown[] };

type FakeState = {
  inTx: boolean;
  txWallMs: number | null;
  txQueryCount: number;
  maxConcurrentInTx: number;
  rolledBack: boolean;
  persisted: WriteRecord[];
  poolQueryStatuses: (string | null)[];
};

type AiCallRecord = { inTx: boolean; count: number; kind: "mcq" | "coding" };

type AiBehavior = { kind: "ok" } | { kind: "fail"; error: AiServiceError };

// ------------------------------------------------------------- fake client

const AI_SKILLS = [
  { id: "skill-a", name: "Arrays" },
  { id: "skill-b", name: "Strings" },
];

/** `offset` makes texts unique ACROSS batches (the validator rejects
 *  duplicates against earlier batches of the same request). */
function aiMcqItems(n: number, offset = 0): GeneratedMcq[] {
  return Array.from({ length: n }, (_, i) => {
    const k = offset + i + 1;
    return {
      question: `Generated question ${k} for the regression suite`,
      options: [
        { text: `Generated option A ${k}`, isCorrect: true },
        { text: `Generated option B ${k}`, isCorrect: false },
        { text: `Generated option C ${k}`, isCorrect: false },
        { text: `Generated option D ${k}`, isCorrect: false },
      ],
      difficulty: "EASY",
    };
  });
}

function aiCodingItems(n: number): GeneratedCoding[] {
  return Array.from({ length: n }, (_, i) => ({
    title: `Generated challenge ${i + 1}`,
    problemStatement: `Generated problem statement ${i + 1} for the regression suite`,
    language: "python",
    starterCode: "# starter\n",
    constraints: null,
    testCases: [
      { input: "1", expectedOutput: "2", visibility: "PUBLIC" },
      { input: "2", expectedOutput: "4", visibility: "HIDDEN" },
    ],
    difficulty: "EASY",
  }));
}

function libraryPool(n: number, skillsByIndex: { skillId: string }[][]): PoolRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `lib-${i + 1}`,
    difficulty: "EASY",
    questionText: `Library question ${i + 1} for the regression suite`,
    options: [
      { id: `lib-${i + 1}-a`, position: 1, text: `Library option A ${i + 1}`, isCorrect: true },
      { id: `lib-${i + 1}-b`, position: 2, text: `Library option B ${i + 1}`, isCorrect: false },
      { id: `lib-${i + 1}-c`, position: 3, text: `Library option C ${i + 1}`, isCorrect: false },
      { id: `lib-${i + 1}-d`, position: 4, text: `Library option D ${i + 1}`, isCorrect: false },
    ],
    skills: skillsByIndex[i] ?? [],
  }));
}

// ------------------------------------------------------ serial-connection fake

type FakeOptions = {
  pool: PoolRow[];
  /** Fail (throw) when this tx method runs — rollback scenario. */
  failOn?: string;
};

/**
 * Builds a fake PrismaClient whose $transaction models REAL Prisma's
 * interactive-transaction semantics: ONE connection, queries serialized
 * strictly one-at-a-time, each costing RTT + statements x STMT_MS, and a
 * throw inside the callback rolling back every buffered write.
 */
function makeFakeDb(opts: FakeOptions): FakeState & { client: PrismaClient } {
  const state: FakeState = {
    inTx: false,
    txWallMs: null,
    txQueryCount: 0,
    maxConcurrentInTx: 0,
    rolledBack: false,
    persisted: [],
    poolQueryStatuses: [],
  };

  const filterPool = (where: Record<string, unknown>): PoolRow[] => {
    let rows = opts.pool;
    const flow = where.assessmentFlow as string | undefined;
    if (flow) rows = rows.filter(() => true); // pool is scoped per scenario
    const jobTitles = where.jobTitles as { some?: { jobTitleId?: string } } | undefined;
    if (jobTitles?.some) rows = rows; // pool rows all carry the scenario job title
    const skills = where.skills as { some?: { skillId?: string } } | undefined;
    if (skills?.some) {
      const sid = skills.some.skillId;
      rows = rows.filter((r) => r.skills.some((s) => s.skillId === sid));
    }
    return rows;
  };

  const rowsOf = (model: string, arg: unknown): unknown[] => {
    const data = (arg as { data?: unknown }).data ?? arg;
    if (model === "assessment.create") return [data];
    if (model.endsWith(".createMany")) return (data as unknown[]) ?? [];
    return [data]; // legacy nested create
  };

  /** How many INSERT statements Prisma issues for this call. */
  const stmtsOf = (model: string, arg: unknown): number => {
    const data = (arg as { data?: unknown }).data ?? arg;
    if (model === "assessment.create") {
      const d = data as { questions?: { create: unknown[] }; skills?: { create: unknown[] } };
      return 1 + (d.questions?.create?.length ?? 0) + (d.skills?.create?.length ?? 0);
    }
    if (model === "question.create") {
      // Legacy nested create: one INSERT per child (options + join rows).
      const d = data as {
        options?: { create: unknown[] };
        areas?: { create: unknown[] };
        jobTitles?: { create: unknown[] };
        skills?: { create: unknown[] };
      };
      return (
        1 +
        (d.options?.create?.length ?? 0) +
        (d.areas?.create?.length ?? 0) +
        (d.jobTitles?.create?.length ?? 0) +
        (d.skills?.create?.length ?? 0)
      );
    }
    return 1; // bulk createMany = ONE multi-row INSERT
  };

  const raw = {
    // -- autocommit reads (outside any transaction) ----------------------
    assessment: {
      findUnique: async () => null, // no idempotent replay in these scenarios
    },
    areaOfInterest: {
      findFirst: async () => ({ id: "area-1", categoryId: "cat-1", name: "Aptitude" }),
    },
    jobTitle: {
      findFirst: async () => ({ id: "jt-1", name: "Backend Developer" }),
    },
    skill: {
      findMany: async () => AI_SKILLS,
    },
    question: {
      findMany: async (arg: { where?: Record<string, unknown> }) => {
        const where = arg.where ?? {};
        state.poolQueryStatuses.push((where.status as string | undefined) ?? null);
        return filterPool(where);
      },
    },
    codingQuestion: {
      findMany: async () => [] as { problemStatement: string; language: string }[],
    },
    // -- interactive transaction: ONE connection, strictly serial --------
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      state.inTx = true;
      state.txWallMs = null;
      state.txQueryCount = 0;
      state.maxConcurrentInTx = 0;
      state.rolledBack = false;
      const buffered: WriteRecord[] = [];
      let active = 0;
      let chain: Promise<unknown> = Promise.resolve();

      const makeQuery =
        (model: string) =>
        async (arg: unknown) => {
          const stmts = stmtsOf(model, arg);
          const step = async () => {
            active += 1;
            if (active > state.maxConcurrentInTx) state.maxConcurrentInTx = active;
            state.txQueryCount += 1;
            // Serial connection: this query occupies the connection for its
            // full duration; the next query starts only when it finishes.
            await sleep(RTT_MS + stmts * STMT_MS);
            if (opts.failOn === model) {
              active -= 1;
              throw new Error(`simulated database failure in ${model} (rollback test)`);
            }
            active -= 1;
            buffered.push({ model, rows: rowsOf(model, arg) });
            return model === "assessment.create" ? { id: "assess-1" } : undefined;
          };
          const p = chain.then(step);
          chain = p.catch(() => undefined); // keep the queue alive
          return p;
        };

      const tx = {
        assessment: { create: makeQuery("assessment.create") },
        question: {
          create: makeQuery("question.create"),
          createMany: makeQuery("question.createMany"),
        },
        questionOption: { createMany: makeQuery("questionOption.createMany") },
        questionArea: { createMany: makeQuery("questionArea.createMany") },
        questionJobTitle: { createMany: makeQuery("questionJobTitle.createMany") },
        questionSkill: { createMany: makeQuery("questionSkill.createMany") },
        assessmentQuestion: { createMany: makeQuery("assessmentQuestion.createMany") },
        assessmentSkill: { createMany: makeQuery("assessmentSkill.createMany") },
        // The create path must NEVER write history; if it tries, the query
        // is recorded and the scenario's assertions fail on it.
        userQuestionHistory: {
          createMany: makeQuery("userQuestionHistory.createMany"),
          updateMany: makeQuery("userQuestionHistory.updateMany"),
        },
      };

      const start = Date.now();
      try {
        const result = await fn(tx);
        // Commit: everything buffered becomes persisted.
        state.persisted = buffered;
        return result;
      } catch (e) {
        // Real Prisma: a throw inside the callback rolls back the whole
        // interactive transaction — nothing buffered is committed.
        state.rolledBack = true;
        state.persisted = [];
        throw e;
      } finally {
        state.inTx = false;
        state.txWallMs = Date.now() - start;
      }
    },
  };

  return Object.assign(state, {
    client: raw as unknown as PrismaClient,
  }) as FakeState & { client: PrismaClient };
}

function installFakeDb(opts: FakeOptions): FakeState & { client: PrismaClient } {
  const fake = makeFakeDb(opts);
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = fake.client;
  if (getPrisma() !== fake.client) {
    throw new Error("test setup: globalThis.prisma seam was not installed");
  }
  return fake;
}

function installFakeAiClient(state: FakeState, aiCalls: AiCallRecord[], behavior: AiBehavior) {
  let mcqOffset = 0;
  const generateMcqFake = async (request: Parameters<typeof generateMcq>[0]): Promise<GeneratedMcq[]> => {
    aiCalls.push({ inTx: state.inTx, count: request.count, kind: "mcq" });
    await sleep(AI_SIMULATED_LATENCY_MS);
    if (behavior.kind === "fail") throw behavior.error;
    const items = aiMcqItems(request.count, mcqOffset);
    mcqOffset += request.count;
    return items;
  };
  const generateCodingFake = async (
    request: Parameters<typeof generateCoding>[0],
  ): Promise<GeneratedCoding[]> => {
    aiCalls.push({ inTx: state.inTx, count: request.count, kind: "coding" });
    await sleep(AI_SIMULATED_LATENCY_MS);
    if (behavior.kind === "fail") throw behavior.error;
    return aiCodingItems(request.count);
  };
  setGenerationClientForTests({
    generateMcq: generateMcqFake as typeof generateMcq,
    generateCoding: generateCodingFake as typeof generateCoding,
  });
}

// ------------------------------------------------------------------ helpers

function rowsOf(state: FakeState, model: string): unknown[] {
  return state.persisted.filter((w) => w.model === model).flatMap((w) => w.rows);
}

function assessmentData(state: FakeState): { questions: { create: AqNestedRow[] }; skills?: { create: SkillNestedRow[] } } {
  const data = rowsOf(state, "assessment.create")[0] as
    | { questions: { create: AqNestedRow[] }; skills?: { create: SkillNestedRow[] } }
    | undefined;
  return data
    ? { questions: data.questions, skills: data.skills }
    : { questions: { create: [] } };
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

/** Every option id embedded in a snapshot must exist as a QuestionOption
 *  row on the question the snapshot belongs to (UserAnswer.selectedOptionId
 *  carries an FK to QuestionOption). */
function snapshotOptionFksResolve(state: FakeState, aqRows: AqNestedRow[]): boolean {
  const options = rowsOf(state, "questionOption.createMany") as OptionRow[];
  const byQuestion = new Map<string, OptionRow[]>();
  for (const o of options) {
    const list = byQuestion.get(o.questionId) ?? [];
    list.push(o);
    byQuestion.set(o.questionId, list);
  }
  const anchors = rowsOf(state, "question.createMany") as AnchorRow[];
  const anchorByText = new Map(anchors.map((a) => [a.questionText, a.id]));
  return aqRows.every((row) => {
    const anchorId = anchorByText.get(row.questionSnapshot.questionText);
    if (anchorId === undefined) {
      // Library rows have no DRAFT anchor — only AI rows may be anchorless
      // if the scenario failed to create them.
      return row.libraryQuestionId !== null;
    }
    const opts = byQuestion.get(anchorId) ?? [];
    return row.questionSnapshot.options.every((o) => opts.some((ro) => ro.id === o.id));
  });
}

// ---------------------------------------------------------------- scenarios

type SkillSource = "USER_SELECTED" | "JD" | "JOB_TITLE";

type DraftArgs = {
  flow: "GENERAL" | "BASIC_SKILLS_MCQ" | "CODING";
  pool: PoolRow[];
  behavior: AiBehavior;
  /** The injected DB failure is EXPECTED here (no error log). */
  failOn?: string;
  count?: number;
  selection?: { areaId?: string; jobTitleId?: string; language?: string };
  quotaSkills?: string[];
  skillSources?: Record<string, SkillSource[]>;
  jobTitleId?: string | null;
};

async function runScenario(args: DraftArgs): Promise<{
  result: CreateResult | "threw";
  state: FakeState;
  aiCalls: AiCallRecord[];
}> {
  const state = installFakeDb({ pool: args.pool, failOn: args.failOn });
  const aiCalls: AiCallRecord[] = [];
  installFakeAiClient(state, aiCalls, args.behavior);
  const jobTitleId = args.jobTitleId ?? (args.flow === "GENERAL" ? null : "jt-1");
  let result: CreateResult | "threw";
  try {
    result = await createAssessment({
      userId: "user-1",
      clientRequestId: crypto.randomUUID(),
      flow: args.flow,
      categoryId: "cat-1",
      areaId: args.selection?.areaId ?? "area-1",
      jobTitleId,
      difficulty: "EASY",
      experienceBand: null,
      count: args.count ?? 5,
      previewEnabled: false,
      jd: null,
      selection: {
        userId: "user-1",
        flow: args.flow,
        difficulty: "EASY",
        areaId: args.selection?.areaId ?? "area-1",
        // SelectionContext.jobTitleId is optional (undefined, not null).
        jobTitleId: jobTitleId ?? undefined,
        language: args.selection?.language,
      },
      quotaSkills: args.quotaSkills,
      skillSources: args.skillSources,
    });
  } catch (e) {
    if (!args.failOn) {
      console.error("  [scenario error]", e instanceof Error ? e.stack : e);
    }
    result = "threw";
  }
  setGenerationClientForTests(null);
  return { result, state, aiCalls };
}

// S1 — the production failure shape: GENERAL, empty pool, 5 AI anchors.
async function scenario1(): Promise<void> {
  console.log("S1: GENERAL / EASY / 5 requested, empty library pool -> 5 AI anchors");
  const { result, state, aiCalls } = await runScenario({
    flow: "GENERAL",
    pool: [],
    behavior: { kind: "ok" },
  });

  check("exactly ONE AI generation request, with NO transaction open",
    aiCalls.length === 1 && aiCalls[0].inTx === false, `calls=${aiCalls.length} inTx=${aiCalls[0]?.inTx}`);
  check(`transaction wall time under the ${PRISMA_TX_BUDGET_MS} ms Prisma budget (serial model)`,
    state.txWallMs !== null && state.txWallMs < PRISMA_TX_BUDGET_MS, `txWallMs=${state.txWallMs}`);
  check("exactly 4 round-trips (nested assessment + 3 bulk anchor writes)",
    state.txQueryCount === 4, `roundTrips=${state.txQueryCount}`);
  check("queries stayed strictly serial on the single connection",
    state.maxConcurrentInTx === 1, `maxConcurrent=${state.maxConcurrentInTx}`);
  check("bulk shape: createMany used, no per-question nested create",
    rowsOf(state, "question.createMany").length === 5 &&
      rowsOf(state, "question.create").length === 0 &&
      rowsOf(state, "assessmentQuestion.createMany").length === 0,
    `question.create=${rowsOf(state, "question.create").length}`);
  check("result is ok (IN_PROGRESS, preview off)",
    result !== "threw" && result.ok === true && result.status === "IN_PROGRESS", JSON.stringify(result));

  const aqRows = assessmentData(state).questions.create;
  check("5 AssessmentQuestion rows nested under the assessment",
    aqRows.length === 5, `rows=${aqRows.length}`);
  check("all 5 rows are AI_GENERATED with libraryQuestionId=null, sequences 1..5",
    aqRows.every((r, i) => r.source === "AI_GENERATED" && r.libraryQuestionId === null && r.sequence === i + 1),
    JSON.stringify(aqRows.map((r) => [r.sequence, r.source, r.libraryQuestionId])));

  const anchors = rowsOf(state, "question.createMany") as AnchorRow[];
  check("5 DRAFT Question anchors with flow/difficulty preserved",
    anchors.length === 5 &&
      anchors.every((a) => a.status === "DRAFT" && a.assessmentFlow === "GENERAL" && a.difficulty === "EASY"),
    JSON.stringify(anchors.map((a) => [a.status, a.assessmentFlow, a.difficulty])));
  const expectedQ = (n: number) => new Set(Array.from({ length: n }, (_, i) => `Generated question ${i + 1} for the regression suite`));
  check("anchor texts are exactly the 5 generated questions",
    new Set(anchors.map((a) => a.questionText)).size === 5 &&
      [...new Set(anchors.map((a) => a.questionText))].every((t) => expectedQ(5).has(t)));

  const options = rowsOf(state, "questionOption.createMany") as OptionRow[];
  check("20 QuestionOption rows (4 per anchor), linked to their anchor",
    options.length === 20 &&
      anchors.every((a) => options.filter((o) => o.questionId === a.id).length === 4));
  const optionsPreserved = anchors.every((a) => {
    const n = Number(a.questionText.match(/Generated question (\d+)/)?.[1] ?? "0");
    const mine = options.filter((o) => o.questionId === a.id);
    const expected = [
      { p: 1, t: `Generated option A ${n}`, c: true },
      { p: 2, t: `Generated option B ${n}`, c: false },
      { p: 3, t: `Generated option C ${n}`, c: false },
      { p: 4, t: `Generated option D ${n}`, c: false },
    ];
    return expected.every((e) =>
      mine.some((o) => o.position === e.p && o.text === e.t && o.isCorrect === e.c),
    );
  });
  check("option ids/positions/text/isCorrect preserved exactly", optionsPreserved);

  const areaLinks = rowsOf(state, "questionArea.createMany") as LinkRow[];
  check("5 QuestionArea links anchor -> area",
    areaLinks.length === 5 &&
      areaLinks.every((l) => l.areaOfInterestId === "area-1") &&
      new Set(areaLinks.map((l) => l.questionId)).size === 5);

  check("snapshot option ids resolve to real QuestionOption rows",
    snapshotOptionFksResolve(state, aqRows));
  check("NO UserQuestionHistory writes on the create path",
    rowsOf(state, "userQuestionHistory.createMany").length === 0 &&
      rowsOf(state, "userQuestionHistory.updateMany").length === 0);
  check("selection only ever queried LIVE questions (DRAFT stays out)",
    state.poolQueryStatuses.length > 0 &&
      state.poolQueryStatuses.every((s) => s === "LIVE"),
    JSON.stringify(state.poolQueryStatuses));
  console.log(`  info  measured transaction: wall=${state.txWallMs} ms, roundTrips=${state.txQueryCount} (old path: 7 round-trips / ~5480 ms under this model)`);
}

// S2 — AI failure keeps the f1e5d0f contract: actual message, zero writes.
async function scenario2(): Promise<void> {
  console.log("S2: same shape, AI generation fails -> controlled aiFailure, zero writes");
  const providerMessage = "The question generator failed. Please try again.";
  const { result, state, aiCalls } = await runScenario({
    flow: "GENERAL",
    pool: [],
    behavior: { kind: "fail", error: new AiServiceError("provider-error", providerMessage) },
  });

  check("result is the controlled insufficient state (available=0)",
    result !== "threw" && result.ok === false && result.reason === "insufficient" && result.available === 0,
    JSON.stringify(result));
  check("the ACTUAL AI failure message is surfaced (f1e5d0f behavior)",
    result !== "threw" && result.ok === false && result.reason === "insufficient" && result.aiFailure === providerMessage,
    `aiFailure=${result !== "threw" && result.ok === false && result.reason === "insufficient" ? result.aiFailure : "<n/a>"}`);
  check("the failing AI call ran with NO transaction open",
    aiCalls.length === 1 && aiCalls[0].inTx === false);
  check("nothing persisted and the transaction wrote nothing",
    state.persisted.length === 0 && state.txQueryCount === 0,
    `persisted=${state.persisted.length} txQueries=${state.txQueryCount}`);
  check("no transaction is left open", state.inTx === false);
}

// S3 — library-first: sufficient pool never calls the AI client.
async function scenario3(): Promise<void> {
  console.log("S3: sufficient library pool (5/5) -> library-first, single round-trip");
  const { result, state, aiCalls } = await runScenario({
    flow: "GENERAL",
    pool: libraryPool(5, []),
    behavior: { kind: "ok" },
  });

  check("the AI client was NEVER called", aiCalls.length === 0, `calls=${aiCalls.length}`);
  check("result is ok", result !== "threw" && result.ok === true, JSON.stringify(result));
  const aqRows = assessmentData(state).questions.create;
  check("5 QUESTION_LIBRARY rows with their library ids",
    aqRows.length === 5 &&
      aqRows.every((r) => r.source === "QUESTION_LIBRARY" && r.libraryQuestionId !== null),
    JSON.stringify(aqRows.map((r) => [r.source, r.libraryQuestionId])));
  check("no DRAFT anchors created",
    rowsOf(state, "question.createMany").length === 0 && rowsOf(state, "questionOption.createMany").length === 0);
  check("exactly 1 round-trip (assessment with nested snapshot rows)",
    state.txQueryCount === 1, `roundTrips=${state.txQueryCount}`);
}

// S4 — BASIC_SKILLS_MCQ: quota skills + all three join models + AI gaps.
async function scenario4(): Promise<void> {
  console.log("S4: BASIC_SKILLS_MCQ / 2 skills / 3 library + 2 AI gaps");
  const pool = [
    ...libraryPool(2, [[{ skillId: "skill-a" }], [{ skillId: "skill-a" }]]),
    ...libraryPool(1, [[{ skillId: "skill-b" }]]).map((r) => ({ ...r, id: "lib-b1" })),
  ];
  const { result, state, aiCalls } = await runScenario({
    flow: "BASIC_SKILLS_MCQ",
    pool,
    behavior: { kind: "ok" },
    quotaSkills: ["skill-a", "skill-b"],
    skillSources: {
      "skill-a": ["USER_SELECTED", "JOB_TITLE"],
      "skill-b": ["JOB_TITLE"],
    },
  });

  check("two per-skill AI batches, both with NO transaction open",
    aiCalls.length === 2 && aiCalls.every((c) => c.inTx === false && c.count === 1),
    JSON.stringify(aiCalls));
  check(`transaction wall time under the ${PRISMA_TX_BUDGET_MS} ms budget`,
    state.txWallMs !== null && state.txWallMs < PRISMA_TX_BUDGET_MS, `txWallMs=${state.txWallMs}`);
  check("exactly 6 round-trips (nested assessment + 5 bulk writes)",
    state.txQueryCount === 6, `roundTrips=${state.txQueryCount}`);
  check("result is ok", result !== "threw" && result.ok === true, JSON.stringify(result));

  const aqRows = assessmentData(state).questions.create;
  check("5 rows: 3 QUESTION_LIBRARY + 2 AI_GENERATED",
    aqRows.length === 5 &&
      aqRows.filter((r) => r.source === "QUESTION_LIBRARY").length === 3 &&
      aqRows.filter((r) => r.source === "AI_GENERATED").length === 2);
  const aiRows = aqRows.filter((r) => r.source === "AI_GENERATED");
  check("AI rows carry their quota skill; library rows keep their skill attribution",
    aiRows.length === 2 &&
      new Set(aiRows.map((r) => r.skillId)).size === 2 &&
      aiRows.every((r) => r.skillId === "skill-a" || r.skillId === "skill-b") &&
      aqRows.filter((r) => r.source === "QUESTION_LIBRARY").every((r) => r.skillId !== null));

  const skillRows = assessmentData(state).skills?.create ?? [];
  check("AssessmentSkill rows preserved with their sources",
    skillRows.length === 2 &&
      JSON.stringify(skillRows.find((s) => s.skillId === "skill-a")?.sources) === JSON.stringify(["USER_SELECTED", "JOB_TITLE"]) &&
      JSON.stringify(skillRows.find((s) => s.skillId === "skill-b")?.sources) === JSON.stringify(["JOB_TITLE"]),
    JSON.stringify(skillRows));

  const anchors = rowsOf(state, "question.createMany") as AnchorRow[];
  check("2 DRAFT anchors, flow preserved",
    anchors.length === 2 && anchors.every((a) => a.status === "DRAFT" && a.assessmentFlow === "BASIC_SKILLS_MCQ"));
  const areaLinks = rowsOf(state, "questionArea.createMany") as LinkRow[];
  const jtLinks = rowsOf(state, "questionJobTitle.createMany") as LinkRow[];
  const skLinks = rowsOf(state, "questionSkill.createMany") as LinkRow[];
  check("all three join models: 2 area + 2 job-title links",
    areaLinks.length === 2 && jtLinks.length === 2 &&
      areaLinks.every((l) => l.areaOfInterestId === "area-1") &&
      jtLinks.every((l) => l.jobTitleId === "jt-1"));
  check("skill links match the AI rows' quota attribution",
    skLinks.length === 2 &&
      aiRows.every((r) => {
        const anchor = anchors.find((a) => a.questionText === r.questionSnapshot.questionText);
        return anchor !== undefined && skLinks.some((l) => l.questionId === anchor.id && l.skillId === r.skillId);
      }));
  check("snapshot option ids resolve to real QuestionOption rows",
    rowsOf(state, "questionOption.createMany").length === 8 && snapshotOptionFksResolve(state, aqRows));
  check("NO UserQuestionHistory writes",
    rowsOf(state, "userQuestionHistory.createMany").length === 0);
  console.log(`  info  measured transaction: wall=${state.txWallMs} ms, roundTrips=${state.txQueryCount}`);
}

// S5 — rollback atomicity: a mid-transaction DB failure leaves zero rows.
async function scenario5(): Promise<void> {
  console.log("S5: DB failure mid-transaction -> full rollback, zero persisted rows");
  const { result, state, aiCalls } = await runScenario({
    flow: "GENERAL",
    pool: [],
    behavior: { kind: "ok" },
    failOn: "questionOption.createMany",
  });

  check("the failure propagated out of createAssessment", result === "threw", JSON.stringify(result));
  check("the transaction was marked rolled back", state.rolledBack === true);
  check("ZERO persisted rows (no orphan DRAFT anchors, no partial rows)",
    state.persisted.length === 0,
    JSON.stringify(state.persisted.map((w) => [w.model, w.rows.length])));
  check("AI had succeeded (failure was in persistence, not generation)",
    aiCalls.length === 1 && aiCalls[0].inTx === false);
  check("no transaction is left open", state.inTx === false);
}

// S6 — CODING: ephemeral AI challenges, no anchors, one round-trip.
async function scenario6(): Promise<void> {
  console.log("S6: CODING / python / 2 requested, empty pool -> 2 AI challenges, 1 round-trip");
  const { result, state, aiCalls } = await runScenario({
    flow: "CODING",
    pool: [],
    behavior: { kind: "ok" },
    count: 2,
    selection: { language: "python" },
  });

  check("one coding AI batch, with NO transaction open",
    aiCalls.length === 1 && aiCalls[0].kind === "coding" && aiCalls[0].inTx === false,
    JSON.stringify(aiCalls));
  check("result is ok", result !== "threw" && result.ok === true, JSON.stringify(result));
  check("exactly 1 round-trip (assessment with nested coding rows)",
    state.txQueryCount === 1, `roundTrips=${state.txQueryCount}`);
  const aqRows = assessmentData(state).questions.create;
  check("2 AI_CODING_GENERATED rows, codingQuestionId=null",
    aqRows.length === 2 &&
      aqRows.every((r) => r.source === "AI_CODING_GENERATED" && r.codingQuestionId === null && r.libraryQuestionId === null),
    JSON.stringify(aqRows.map((r) => [r.source, r.codingQuestionId])));
  check("no MCQ anchor models were touched",
    rowsOf(state, "question.createMany").length === 0 &&
      rowsOf(state, "questionOption.createMany").length === 0);
  check(`transaction wall time under the ${PRISMA_TX_BUDGET_MS} ms budget`,
    state.txWallMs !== null && state.txWallMs < PRISMA_TX_BUDGET_MS, `txWallMs=${state.txWallMs}`);
}

// -------------------------------------------------------------------- main

async function main(): Promise<void> {
  console.log(
    `assessment-creation-tx-regression (REAL Prisma serial model: ${RTT_MS} ms/round-trip + ${STMT_MS} ms/INSERT, budget ${PRISMA_TX_BUDGET_MS} ms)\n`,
  );
  await scenario1();
  await scenario2();
  await scenario3();
  await scenario4();
  await scenario5();
  await scenario6();
  console.log(
    failures === 0 ? "\nRESULT: ALL CHECKS PASSED" : `\nRESULT: ${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
