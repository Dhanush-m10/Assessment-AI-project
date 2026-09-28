import { getPrisma } from "@/lib/prisma";
import { languageLabel, resolveJudge0Language } from "@/lib/judge0/languages";

/**
 * First-class programming-language selection for CODING assessments (Phase C3).
 *
 * Language support is NEVER invented: the options are derived from the LIVE
 * coding library for the job title AND restricted to languages the Judge0
 * client can actually execute (central map in lib/judge0/languages.ts).
 * A job title whose published challenges cover one language shows exactly
 * that language; titles without published challenges show none — the
 * selector never displays a fake option.
 */

export type CodingLanguageOption = {
  /** Normalized stored value (lowercase), e.g. "python". */
  value: string;
  /** Display label from the central Judge0 map, e.g. "Python 3". */
  label: string;
};

/** Distinct executable languages of the LIVE coding challenges tagged for
 *  this job title, sorted by label. Empty = no published challenges yet. */
export async function listCodingLanguageOptions(
  jobTitleId: string,
): Promise<CodingLanguageOption[]> {
  const rows = (await getPrisma().codingQuestion.findMany({
    where: { status: "LIVE", jobTitles: { some: { jobTitleId } } },
    select: { language: true },
  })) as { language: string }[];

  const seen = new Set<string>();
  const options: CodingLanguageOption[] = [];
  for (const row of rows) {
    const value = row.language.trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    // Only languages the Judge0 client can execute (no fake support).
    if (!resolveJudge0Language(value)) continue;
    seen.add(value);
    options.push({ value, label: languageLabel(value) });
  }
  return options.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

/**
 * Validates a user-selected language: normalized (trimmed, lowercased) and
 * must resolve in the central Judge0 map. Returns null for anything
 * unmapped — callers refuse to create with an invalid language rather than
 * silently substituting.
 */
export function parseCodingLanguage(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  return resolveJudge0Language(value) ? value : null;
}
