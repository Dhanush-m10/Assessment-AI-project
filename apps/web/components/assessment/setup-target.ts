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
 *      `${base}/preview?difficulty=...&count=...&preview=...&clientRequestId=...`
 *      (GENERAL — no experience/adaptive params; clientRequestId is the
 *      idempotency key shared with the creation step, so a double Continue
 *      click can never create two assessments)
 *  - kind "skills" / "jd":
 *      `${base}/${kind}?difficulty=...&experience=...&count=...&preview=...&adaptive=...`
 *      (BASIC_MCQ / BASIC_SKILLS_MCQ role chain — role creation gets
 *      its own clientRequestId from the JD form, so no id in this URL)
 *  - kind "coding":
 *      no URL (Phase C4) — the form submits to the creation server action;
 *      buildSetupHref throws for it.
 *
 * Behavioral note preserved from the old callback: adaptive starts never
 * preview, so the `preview` param is forced to "off" when adaptive is on.
 */
export type SetupFormTarget =
  | { kind: "preview"; base: string }
  | { kind: "skills"; base: string }
  | { kind: "jd"; base: string }
  /** CODING (Phase C4): the setup form IS the creation step — it submits
   *  to the startCodingAssessment server action (no navigation, no /skills
   *  step). areaId/jobTitleId ride along as plain serializable data. */
  | { kind: "coding"; areaId: string; jobTitleId: string };

export type SetupFormValues = {
  difficulty: string;
  experience: string;
  count: number;
  preview: boolean;
  adaptive: boolean;
  /** GENERAL only: idempotency key for the creation step (double-click safe). */
  clientRequestId?: string;
  /** CODING only (Phase C3): the selected programming language. */
  language?: string;
};

export function buildSetupHref(target: SetupFormTarget, v: SetupFormValues): string {
  // The CODING target never navigates (Phase C4): it is submitted to the
  // creation server action, so there is no URL to build.
  if (target.kind === "coding") {
    throw new Error("buildSetupHref: the coding target submits to a server action, it does not navigate.");
  }
  // Adaptive assessments start immediately (no fixed set to preview).
  const preview = v.adaptive ? false : v.preview;
  const query =
    target.kind === "preview"
      ? `difficulty=${v.difficulty}&count=${v.count}&preview=${preview ? "on" : "off"}${
          v.clientRequestId ? `&clientRequestId=${v.clientRequestId}` : ""
        }`
      : `difficulty=${v.difficulty}&experience=${v.experience}&count=${v.count}&preview=${preview ? "on" : "off"}&adaptive=${v.adaptive ? "on" : "off"}${
          v.language ? `&language=${encodeURIComponent(v.language)}` : ""
        }`;
  return `${target.base}/${target.kind}?${query}`;
}
