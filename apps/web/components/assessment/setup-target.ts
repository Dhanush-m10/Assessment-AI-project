/**
 * Serializable navigation target for SetupForm.
 *
 * SetupForm is a Client Component, and React Server Components can only pass
 * plain (serializable) data across the server/client boundary — a callback
 * like the old `hrefFor={(p) => ...}` prop throws at RSC serialization time
 * ("Functions cannot be passed directly to Client Components"). The target
 * below is plain data that fully determines the destination URL; SetupForm
 * assembles it client-side on submit.
 *
 * URL shapes (byte-identical to the pre-fix hrefFor callbacks):
 *  - kind "preview":
 *      `${base}/preview?difficulty=...&count=...&preview=...`
 *      (GENERAL — no experience/adaptive params)
 *  - kind "skills" / "jd":
 *      `${base}/${kind}?difficulty=...&experience=...&count=...&preview=...&adaptive=...`
 *      (BASIC_MCQ / BASIC_SKILLS_MCQ / CODING role chain)
 *
 * Behavioral note preserved from the old callback: adaptive starts never
 * preview, so the `preview` param is forced to "off" when adaptive is on.
 */
export type SetupFormTarget =
  | { kind: "preview"; base: string }
  | { kind: "skills"; base: string }
  | { kind: "jd"; base: string };

export type SetupFormValues = {
  difficulty: string;
  experience: string;
  count: number;
  preview: boolean;
  adaptive: boolean;
};

export function buildSetupHref(target: SetupFormTarget, v: SetupFormValues): string {
  // Adaptive assessments start immediately (no fixed set to preview).
  const preview = v.adaptive ? false : v.preview;
  const query =
    target.kind === "preview"
      ? `difficulty=${v.difficulty}&count=${v.count}&preview=${preview ? "on" : "off"}`
      : `difficulty=${v.difficulty}&experience=${v.experience}&count=${v.count}&preview=${preview ? "on" : "off"}&adaptive=${v.adaptive ? "on" : "off"}`;
  return `${target.base}/${target.kind}?${query}`;
}
