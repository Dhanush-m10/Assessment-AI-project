/**
 * Linear step indicator for the role-based setup chain so the user always
 * knows where they are and what comes next.
 */
export function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Setup progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : done
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? "bg-white/20" : done ? "bg-blue-100" : "bg-slate-200"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {label}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="h-px w-4 bg-slate-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
