/**
 * Centralized Judge0 language mapping (decision 10: CodingQuestion.language
 * is a free-form string validated against the Judge0 language list — the
 * mapping lives HERE and nowhere else). Keys are normalized: lowercase,
 * trimmed. Unsupported languages produce a controlled server error; we never
 * silently substitute another language.
 *
 * Language ids are Judge0 CE (v1.36+) ids, identical on self-hosted and
 * RapidAPI deployments.
 */

export type Judge0Language = {
  id: number;
  label: string;
};

const LANGUAGE_MAP: Record<string, Judge0Language> = {
  python: { id: 71, label: "Python 3" },
  python3: { id: 71, label: "Python 3" },
  javascript: { id: 63, label: "JavaScript (Node.js)" },
  node: { id: 63, label: "JavaScript (Node.js)" },
  nodejs: { id: 63, label: "JavaScript (Node.js)" },
  typescript: { id: 74, label: "TypeScript" },
  java: { id: 62, label: "Java" },
  c: { id: 50, label: "C (GCC)" },
  "c++": { id: 54, label: "C++ (GCC)" },
  cpp: { id: 54, label: "C++ (GCC)" },
  csharp: { id: 51, label: "C#" },
  "c#": { id: 51, label: "C#" },
  go: { id: 60, label: "Go" },
  rust: { id: 73, label: "Rust" },
  php: { id: 68, label: "PHP" },
  ruby: { id: 72, label: "Ruby" },
  kotlin: { id: 78, label: "Kotlin" },
  swift: { id: 83, label: "Swift" },
};

export function resolveJudge0Language(language: string): Judge0Language | null {
  return LANGUAGE_MAP[language.trim().toLowerCase()] ?? null;
}

/** Human-readable label for a stored CodingQuestion.language value. */
export function languageLabel(language: string): string {
  return resolveJudge0Language(language)?.label ?? language;
}

/**
 * Judge0 status id -> safe user-facing label. Statuses >= 3 are finished
 * executions (https://github.com/judge0/judge0/blob/master/docs/api.md).
 */
export const JUDGE0_STATUS_LABELS: Record<number, string> = {
  1: "In queue",
  2: "Processing",
  3: "Accepted",
  4: "Wrong answer",
  5: "Time limit exceeded",
  6: "Compilation error",
  7: "Runtime error",
  8: "Memory limit exceeded",
  9: "Internal error",
  10: "Exec format error",
  11: "Command not found",
  12: "Filesystem error",
  13: "Unsupported language",
  14: "Rejected",
};

export function judge0StatusLabel(statusId: number): string {
  return JUDGE0_STATUS_LABELS[statusId] ?? "Execution failed";
}
