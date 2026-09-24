import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import {
  getResultsHistory,
  getSkillProgress,
  type ResultsFilter,
} from "@/lib/queries/candidate";
import { formatDate } from "@/lib/format";
import { Card, EmptyState, ProgressBar, ScoreValue } from "@/components/ui/card";
import {
  IconChart,
  IconDoc,
  IconMedal,
  IconShield,
  IconTrend,
} from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Results · Assessment AI" };

const FILTERS: { id: ResultsFilter; label: string; Icon: typeof IconDoc }[] = [
  { id: "all", label: "All Assessments", Icon: IconDoc },
  { id: "general", label: "General Tests", Icon: IconMedal },
  { id: "personalised", label: "Personalised Tests", Icon: IconShield },
];

/**
 * My Results (reference page 12): tab row (Assessment History / Skill
 * Progress) and a left filter card. Tabs and filters are plain server-rendered
 * links over searchParams — stateless, shareable, zero client JavaScript.
 * All rows belong to the session user (scoped inside the query module).
 */
export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const { tab, filter } = await searchParams;
  const user = await requireUser();

  const skillsTab = tab === "skills";
  const activeFilter: ResultsFilter =
    filter === "general" || filter === "personalised" ? filter : "all";

  const [history, skills] = await Promise.all([
    skillsTab ? Promise.resolve(null) : getResultsHistory(user.id, activeFilter),
    skillsTab ? getSkillProgress(user.id) : Promise.resolve(null),
  ]);

  const tabLink = (target: string | null, label: string, Icon: typeof IconDoc, active: boolean) => (
    <Link
      href={target ? `/results?tab=${target}` : "/results"}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2 px-1 pb-3 text-sm font-semibold ${
        active ? "text-blue-700" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full ${
          active ? "bg-blue-600" : "bg-transparent"
        }`}
      />
    </Link>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Assessment Results
        </h1>
        <p className="mt-2 text-slate-500">
          View your assessment history and track your performance by skill over time.
        </p>
      </div>

      <div className="flex gap-8 border-b border-slate-200">
        {tabLink(null, "Assessment History", IconDoc, !skillsTab)}
        {tabLink("skills", "Skill Progress", IconTrend, skillsTab)}
      </div>

      {skillsTab ? (
        <Card className="p-6">
          <h2 className="text-lg font-extrabold text-slate-900">Skill Progress</h2>
          {!skills || skills.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={<IconTrend className="h-8 w-8" />}
              title="No skill progress yet"
              message="Complete assessments to build your per-skill accuracy history."
            />
          ) : (
            <ul className="mt-6 space-y-5">
              {skills.map((s) => (
                <li key={s.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">{s.name}</span>
                    <span className="text-slate-600">
                      <span className="font-bold text-slate-900">{Math.round(s.pct)}%</span>
                      <span className="ml-2 text-xs text-slate-400">
                        {s.answered} answered
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar pct={s.pct} label={`${s.name} accuracy`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit p-3">
            {FILTERS.map(({ id, label, Icon }) => {
              const active = activeFilter === id;
              return (
                <Link
                  key={id}
                  href={id === "all" ? "/results" : `/results?filter=${id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </Card>

          <Card className="p-6">
            {!history || history.length === 0 ? (
              <EmptyState
                icon={<IconChart className="h-8 w-8" />}
                title="No completed assessments"
                message={
                  activeFilter === "all"
                    ? "Once you complete an assessment it will appear here with its score and date."
                    : "No completed assessments match this filter yet."
                }
                action={
                  <Link
                    href="/assessments"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Start an assessment
                  </Link>
                }
              />
            ) : (
              <>
                <div className="hidden md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                        <th className="rounded-l-lg px-3 py-2.5 font-semibold">Assessment</th>
                        <th className="px-3 py-2.5 font-semibold">Score</th>
                        <th className="px-3 py-2.5 font-semibold">Date</th>
                        <th className="rounded-r-lg px-3 py-2.5 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-900">{r.label}</p>
                            <p className="text-xs text-slate-500">{r.sublabel}</p>
                          </td>
                          <td className="px-3 py-3">
                            {r.finalPercentage === null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <ScoreValue pct={r.finalPercentage} />
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-500">{formatDate(r.completedAt)}</td>
                          <td className="px-3 py-3">
                            <Link
                              href={`/results/${r.id}`}
                              className="font-semibold text-blue-600 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: stacked cards keep the table usable without overflow. */}
                <ul className="space-y-3 md:hidden">
                  {history.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{r.label}</p>
                          <p className="text-xs text-slate-500">
                            {r.sublabel} · {formatDate(r.completedAt)}
                          </p>
                        </div>
                        {r.finalPercentage === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <ScoreValue pct={r.finalPercentage} />
                        )}
                      </div>
                      <Link
                        href={`/results/${r.id}`}
                        className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
