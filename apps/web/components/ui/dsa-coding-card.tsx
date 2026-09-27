import Link from "next/link";
import { IconArrowRight, IconCode } from "@/components/ui/icons";
import { FlowBadge } from "@/components/ui/badges";

/**
 * DSA & Coding entry card (Phase C0). Shared by the dashboard and the New
 * Assessment landing so the entry point never diverges. Links to the coding
 * track page (`/assessments/coding`), which feeds the EXISTING job-title
 * setup chain — no duplicate setup forms.
 *
 * Callers render this only when live CODING job titles exist so the CTA is
 * never dead. `roleNames` (optional) shows the first few role names on the
 * featured (landing) variant; omitted on the compact dashboard variant.
 */
export function DsaCodingCard({ roleNames }: { roleNames?: string[] }) {
  const shown = (roleNames ?? []).slice(0, 4);
  const extra = (roleNames?.length ?? 0) - shown.length;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-safe:hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-start gap-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
        >
          <IconCode className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              DSA &amp; Coding
            </h2>
            <FlowBadge flow="CODING" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Solve programming and data-structure challenges with real code
            execution.
          </p>
          {shown.length > 0 && (
            <p className="mt-2 truncate text-xs text-slate-400">
              {shown.join(" • ")}
              {extra > 0 ? ` • +${extra} more` : ""}
            </p>
          )}
        </div>
      </div>
      <Link
        href="/assessments/coding"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Start Coding <IconArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
