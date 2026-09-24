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
