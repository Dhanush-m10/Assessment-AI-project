/**
 * Question snapshot contract (spec §48, decision C10).
 *
 * The snapshot is the immutable serve+score payload stored on
 * AssessmentQuestion.questionSnapshot (Json, NOT NULL). It is SERVER-ONLY:
 * toClientView() strips correctness so client components can never see the
 * answer key, even accidentally.
 */
export type QuestionSnapshot = {
  v: 1;
  questionText: string;
  options: { id: string; position: number; text: string }[];
  correctOptionId: string;
};

export type ClientQuestion = {
  id: string;
  sequence: number;
  text: string;
  options: { id: string; text: string }[];
};

export function buildSnapshot(input: {
  questionText: string;
  options: { id: string; position: number; text: string; isCorrect: boolean }[];
}): QuestionSnapshot {
  const correct = input.options.filter((o) => o.isCorrect);
  if (correct.length !== 1) {
    throw new Error("Library question must have exactly one correct option.");
  }
  return {
    v: 1,
    questionText: input.questionText,
    options: input.options.map((o) => ({ id: o.id, position: o.position, text: o.text })),
    correctOptionId: correct[0].id,
  };
}

/** Parse + shape-check a stored snapshot; throws on corruption. */
export function parseSnapshot(value: unknown): QuestionSnapshot {
  const s = value as QuestionSnapshot;
  if (
    !s ||
    s.v !== 1 ||
    typeof s.questionText !== "string" ||
    !Array.isArray(s.options) ||
    typeof s.correctOptionId !== "string"
  ) {
    throw new Error("Corrupt question snapshot.");
  }
  return s;
}

// ---------------------------------------------------------------------------
// Coding snapshots (Phase 7). Same C10 contract: immutable, server-only.
// HIDDEN test inputs/expected outputs are scoring material and must never
// reach a client projection (toCodingClientView strips them).
// ---------------------------------------------------------------------------

export type CodingTestCaseSnapshot = {
  id: string;
  input: string;
  expectedOutput: string;
  visibility: "PUBLIC" | "HIDDEN";
};

export type CodingSnapshot = {
  v: 1;
  kind: "CODING";
  title: string;
  problemStatement: string;
  language: string;
  starterCode: string;
  constraints: string | null;
  testCases: CodingTestCaseSnapshot[];
};

export type ClientCodingQuestion = {
  kind: "CODING";
  id: string;
  sequence: number;
  title: string;
  problemStatement: string;
  language: string;
  starterCode: string;
  constraints: string | null;
  /** PUBLIC sample tests only — safe to display (spec §24). */
  publicTests: { id: string; input: string; expectedOutput: string }[];
};

export function isCodingSnapshot(value: unknown): boolean {
  return (value as { kind?: unknown })?.kind === "CODING";
}

export function buildCodingSnapshot(input: {
  title: string;
  problemStatement: string;
  language: string;
  starterCode: string | null;
  constraints: string | null;
  testCases: { id: string; input: string; expectedOutput: string; visibility: string }[];
}): CodingSnapshot {
  if (input.testCases.length === 0) {
    throw new Error("Coding question must have at least one test case.");
  }
  return {
    v: 1,
    kind: "CODING",
    title: input.title,
    problemStatement: input.problemStatement,
    language: input.language,
    starterCode: input.starterCode ?? "",
    constraints: input.constraints,
    testCases: input.testCases.map((t) => ({
      id: t.id,
      input: t.input,
      expectedOutput: t.expectedOutput,
      visibility: t.visibility === "PUBLIC" ? "PUBLIC" : "HIDDEN",
    })),
  };
}

/** Parse + shape-check a coding snapshot; throws on corruption. */
export function parseCodingSnapshot(value: unknown): CodingSnapshot {
  const s = value as CodingSnapshot;
  if (
    !s ||
    s.v !== 1 ||
    s.kind !== "CODING" ||
    typeof s.title !== "string" ||
    typeof s.problemStatement !== "string" ||
    typeof s.language !== "string" ||
    typeof s.starterCode !== "string" ||
    !Array.isArray(s.testCases) ||
    s.testCases.some(
      (t) => typeof t?.input !== "string" || typeof t?.expectedOutput !== "string",
    )
  ) {
    throw new Error("Corrupt coding snapshot.");
  }
  return s;
}

/** Display-safe projection: HIDDEN test contents are never included. */
export function toCodingClientView(
  assessmentQuestionId: string,
  sequence: number,
  snapshot: CodingSnapshot,
): ClientCodingQuestion {
  return {
    kind: "CODING",
    id: assessmentQuestionId,
    sequence,
    title: snapshot.title,
    problemStatement: snapshot.problemStatement,
    language: snapshot.language,
    starterCode: snapshot.starterCode,
    constraints: snapshot.constraints,
    publicTests: snapshot.testCases
      .filter((t) => t.visibility === "PUBLIC")
      .map((t) => ({ id: t.id, input: t.input, expectedOutput: t.expectedOutput })),
  };
}

/** Display-safe projection: no correctOptionId, no scoring metadata. */
export function toClientView(
  assessmentQuestionId: string,
  sequence: number,
  snapshot: QuestionSnapshot,
): ClientQuestion {
  return {
    id: assessmentQuestionId,
    sequence,
    text: snapshot.questionText,
    options: snapshot.options
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, text: o.text })),
  };
}
