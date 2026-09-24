/**
 * Presentation-only visual mapping for assessment categories.
 *
 * CENTRALIZED ON PURPOSE: business data (names, counts, statuses) always
 * comes from the database; this file only decides which illustration motif
 * and gradient a category renders with, keyed by category slug with a stable
 * hash fallback. No schema change, no fake content.
 */
export type VisualKey =
  | "ai"
  | "web"
  | "data"
  | "security"
  | "cloud"
  | "code"
  | "business"
  | "design"
  | "health"
  | "general";

const SLUG_MAP: Record<string, VisualKey> = {
  technology: "web",
  coding: "code",
  data: "data",
  ai: "ai",
  security: "security",
  cloud: "cloud",
  business: "business",
  commerce: "business",
  design: "design",
  healthcare: "health",
  general: "general",
};

export function visualKeyFor(slug: string): VisualKey {
  for (const [key, value] of Object.entries(SLUG_MAP)) {
    if (slug.toLowerCase().includes(key)) return value;
  }
  return "general";
}

export const VISUALS: Record<VisualKey, { gradient: string; label: string }> = {
  ai: { gradient: "from-violet-500 via-purple-500 to-fuchsia-500", label: "Neural network motif" },
  web: { gradient: "from-blue-500 via-indigo-500 to-violet-500", label: "Browser motif" },
  data: { gradient: "from-teal-400 via-cyan-500 to-sky-500", label: "Chart motif" },
  security: { gradient: "from-slate-600 via-slate-700 to-slate-900", label: "Shield motif" },
  cloud: { gradient: "from-sky-400 via-blue-500 to-indigo-500", label: "Cloud motif" },
  code: { gradient: "from-emerald-500 via-teal-500 to-cyan-600", label: "Terminal motif" },
  business: { gradient: "from-amber-400 via-orange-400 to-rose-400", label: "Growth motif" },
  design: { gradient: "from-pink-400 via-fuchsia-500 to-purple-500", label: "Palette motif" },
  health: { gradient: "from-rose-400 via-red-400 to-orange-400", label: "Care motif" },
  general: { gradient: "from-blue-500 via-sky-500 to-cyan-400", label: "Target motif" },
};
