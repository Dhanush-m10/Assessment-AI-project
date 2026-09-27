import { EXPERIENCE_META } from "@/components/assessment/experience-meta";

/**
 * Shared configuration summary (MCQ JD step + coding finalize step).
 * Server-safe presentational component; every value arrives validated.
 */
export function ConfigSummary({
  difficulty,
  experience,
  count,
  preview,
  countNoun = "Questions",
  adaptive = false,
}: {
  difficulty: string;
  experience: string;
  count: number;
  preview: boolean;
  countNoun?: string;
  adaptive?: boolean;
}) {
  const experienceLabel =
    EXPERIENCE_META.find((e) => e.value === experience)?.label ?? experience;

  return (
    <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-slate-500">Difficulty</dt>
        <dd className="font-bold text-slate-900">
          {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">Experience</dt>
        <dd className="font-bold text-slate-900">{experienceLabel}</dd>
      </div>
      <div>
        <dt className="text-slate-500">{countNoun}</dt>
        <dd className="font-bold text-slate-900">{count}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Preview</dt>
        <dd className="font-bold text-slate-900">{adaptive ? "—" : preview ? "On" : "Off"}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Mode</dt>
        <dd className="font-bold text-slate-900">{adaptive ? "Adaptive" : "Standard"}</dd>
      </div>
    </dl>
  );
}
