/**
 * Shared GENERAL-flow limits/constants. Plain module: imported by server
 * engine and client forms alike so both validate against identical rules.
 */
export const GENERAL_COUNT_MIN = 1;
export const GENERAL_COUNT_MAX = 50;

/** D-LIMITS: coding mode is bounded to 1-10 challenges. */
export const CODING_COUNT_MIN = 1;
export const CODING_COUNT_MAX = 10;

export function parseCodingCount(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= CODING_COUNT_MIN && n <= CODING_COUNT_MAX ? n : null;
}

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type DifficultyValue = (typeof DIFFICULTIES)[number];

/** Literal mirror of the Prisma `AssessmentFlow` enum (exactly four flows,
 *  C3). Structural typing keeps this assignable to/from the generated enum
 *  without importing generated-only symbols. */
export const ASSESSMENT_FLOWS = [
  "GENERAL",
  "BASIC_MCQ",
  "BASIC_SKILLS_MCQ",
  "CODING",
] as const;
export type AssessmentFlowValue = (typeof ASSESSMENT_FLOWS)[number];

/** Literal mirror of the Prisma `ExperienceBand` enum (D-EXP). Moved here
 *  from basic-mcq.ts (re-exported there) so the engine draft can type
 *  experienceBand exactly without a circular import. */
export const EXPERIENCE_BANDS = ["Y0_2", "Y2_5", "Y5_8"] as const;
export type ExperienceBandValue = (typeof EXPERIENCE_BANDS)[number];

export const DIFFICULTIES_META: { value: DifficultyValue; label: string; hint: string }[] = [
  { value: "EASY", label: "Easy", hint: "Fundamentals" },
  { value: "MEDIUM", label: "Medium", hint: "Working knowledge" },
  { value: "HARD", label: "Hard", hint: "Deep expertise" },
];
