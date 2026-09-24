/**
 * Shared GENERAL-flow limits/constants. Plain module: imported by server
 * engine and client forms alike so both validate against identical rules.
 */
export const GENERAL_COUNT_MIN = 1;
export const GENERAL_COUNT_MAX = 50;

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type DifficultyValue = (typeof DIFFICULTIES)[number];

export const DIFFICULTIES_META: { value: DifficultyValue; label: string; hint: string }[] = [
  { value: "EASY", label: "Easy", hint: "Fundamentals" },
  { value: "MEDIUM", label: "Medium", hint: "Working knowledge" },
  { value: "HARD", label: "Hard", hint: "Deep expertise" },
];
