import type { ReactNode } from "react";

/** Small shared badges/chips used across setup, cards and results. */

export function SkillChip({
  children,
  emphasized = false,
}: {
  children: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
        emphasized
          ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === "HARD"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : difficulty === "MEDIUM"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>
      {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
    </span>
  );
}

export function FlowBadge({ flow }: { flow: string }) {
  const label =
    flow === "ROLE_BASED"
      ? "Role-based"
      : flow === "BASIC_MCQ"
      ? "Basic MCQ"
      : flow === "BASIC_SKILLS_MCQ"
        ? "Basic + Skills"
        : flow === "CODING"
          ? "Coding"
          : "General";
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
      {label}
    </span>
  );
}

export function SoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
      Soon
    </span>
  );
}
