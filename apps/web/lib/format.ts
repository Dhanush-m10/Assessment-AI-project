/** Server-side display formatting (deterministic, no client hydration risk). */
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(d: Date | null): string {
  return d ? DATE_FMT.format(d) : "—";
}

/** "Fresher"-style band labels matching the reference copy. */
export function bandLabel(band: string | null): string {
  switch (band) {
    case "Y0_2":
      return "Fresher";
    case "Y2_5":
      return "2–5 Years";
    case "Y5_8":
      return "5–8 Years";
    default:
      return "—";
  }
}
