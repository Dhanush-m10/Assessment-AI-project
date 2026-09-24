import type { ReactNode } from "react";

/** White rounded card — the base surface used across the product. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** Bold navy section title with the short blue underline bar from the reference. */
export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
        {children}
        <span aria-hidden className="mt-2 block h-[3px] w-full rounded-full bg-blue-600" />
      </h2>
      {action}
    </div>
  );
}

/** Dashboard statistic card: label, big value, muted caption. */
export function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-[15px] font-bold text-slate-900">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{caption}</p>
    </Card>
  );
}

/**
 * Empty state in the product visual language: muted icon, message and an
 * optional call to action. Used instead of fabricated data everywhere a
 * section has no real rows yet.
 */
export function EmptyState({
  icon,
  title,
  message,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center ${className}`}
    >
      {icon ? <div className="text-slate-400">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Score colour ramp used consistently in tables and cards. */
export function scoreColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

export function ScoreValue({ pct }: { pct: number }) {
  return (
    <span className={`font-bold ${scoreColor(pct)}`}>
      {Math.round(pct)}
      <span className="text-xs font-semibold">%</span>
    </span>
  );
}

/** Thin blue progress bar (skill performance, continue card). */
export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
    </div>
  );
}
