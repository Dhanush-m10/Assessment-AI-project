import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { getDashboardData } from "@/lib/queries/candidate";
import { bandLabel, formatDate } from "@/lib/format";
import {
  Card,
  EmptyState,
  ProgressBar,
  ScoreValue,
  SectionHeading,
  StatCard,
} from "@/components/ui/card";
import { IconArrowRight, IconChart, IconPlusSquare, IconTarget } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard · Assessment AI" };

/**
 * Candidate dashboard (reference pages 1–2): hero, three stat cards,
 * progress comparison vs continue-assessment column, recent assessments and
 * skill performance. Every number comes from getDashboardData() scoped to the
 * session user; sections without data render designed empty states — nothing
 * is fabricated.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const firstName = (user.email ?? "").split("@")[0].split(/[._-]+/)[0] || "there";
  const hasHistory = data.taken > 0;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Welcome back, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-2 text-slate-500">Track your progress and keep improving.</p>
      </section>

      <section aria-label="Statistics" className="grid gap-5 md:grid-cols-3">
        <StatCard
          label="Assessments Taken"
          value={String(data.taken)}
          caption="Assessments Completed"
        />
        <StatCard
          label="Average Score"
          value={data.averagePercentage === null ? "—" : `${Math.round(data.averagePercentage)}%`}
          caption="Across All Assessments"
        />
        <StatCard
          label="Skills Assessed"
          value={String(data.skillsAssessed)}
          caption="Unique Skills Evaluated"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Progress Comparison</h2>
              <p className="mt-1 text-sm text-slate-500">Compare your progress across skills</p>
            </div>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
              This Month vs All Time
            </span>
          </div>

          {data.progressComparison.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={<IconChart className="h-8 w-8" />}
              title="No skill data yet"
              message="Complete your first assessment and your month-over-month skill comparison will appear here."
              action={
                <Link
                  href="/assessments"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <IconPlusSquare className="h-4 w-4" /> Start an assessment
                </Link>
              }
            />
          ) : (
            <>
              <div className="mt-6 flex items-center gap-5 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> This Month
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> All Time
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
                {data.progressComparison.map((s) => (
                  <div key={s.name} className="flex flex-col items-center gap-2">
                    <div className="flex h-36 items-end gap-1.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-slate-800">
                          {s.monthPct === null ? "–" : `${Math.round(s.monthPct)}%`}
                        </span>
                        <div
                          className="w-6 rounded-t bg-blue-600"
                          style={{ height: `${Math.max(4, (s.monthPct ?? 0) * 1.1)}px` }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-slate-400">
                          {Math.round(s.allPct)}%
                        </span>
                        <div
                          className="w-6 rounded-t bg-slate-200"
                          style={{ height: `${Math.max(4, s.allPct * 1.1)}px` }}
                        />
                      </div>
                    </div>
                    <p className="line-clamp-2 text-center text-xs text-slate-500">{s.name}</p>
                  </div>
                ))}
              </div>
              {data.topImprovement && (
                <p className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-slate-700">
                  You&apos;ve improved the most in{" "}
                  <span className="font-bold text-slate-900">{data.topImprovement.name}</span> this
                  month! <span aria-hidden>🎉</span>
                </p>
              )}
            </>
          )}
        </Card>

        {data.continueCard ? (
          <Card className="flex flex-col p-6">
            <h2 className="text-lg font-extrabold text-slate-900">Continue Assessment</h2>
            <p className="mt-1 font-bold text-slate-900">{data.continueCard.label}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {data.continueCard.answered} / {data.continueCard.total} Questions Completed
              </span>
              <span className="font-bold text-slate-900">
                {data.continueCard.total
                  ? Math.round((data.continueCard.answered / data.continueCard.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                pct={
                  data.continueCard.total
                    ? (data.continueCard.answered / data.continueCard.total) * 100
                    : 0
                }
                label="Assessment progress"
              />
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Difficulty</dt>
                <dd className="font-bold text-slate-900">{data.continueCard.difficulty}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Experience</dt>
                <dd className="font-bold text-slate-900">
                  {bandLabel(data.continueCard.experienceBand)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Questions Remaining</dt>
                <dd className="font-bold text-slate-900">
                  {data.continueCard.total - data.continueCard.answered}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Estimated Completion Time</dt>
                <dd className="font-bold text-slate-900">
                  {data.continueCard.estimatedMinutes} mins
                </dd>
              </div>
            </dl>
            <Link
              href={`/assessments/resume/${data.continueCard.id}`}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Continue Assessment
            </Link>
          </Card>
        ) : (
          <Card className="flex flex-col justify-between p-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Continue Assessment</h2>
              <p className="mt-1 text-sm text-slate-500">No assessment in progress.</p>
            </div>
            <EmptyState
              className="mt-4"
              icon={<IconTarget className="h-8 w-8" />}
              title="Nothing to continue"
              message="When you start an assessment it will wait for you here."
            />
            <Link
              href="/assessments"
              className="mt-4 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Browse Assessments
            </Link>
          </Card>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <SectionHeading>Recent Assessments</SectionHeading>
          {data.recent.length === 0 ? (
            <EmptyState
              icon={<IconChart className="h-8 w-8" />}
              title="No assessments yet"
              message={
                hasHistory
                  ? "Completed assessments will be listed here."
                  : "Your completed assessments will appear here with scores and dates."
              }
              action={
                <Link
                  href="/assessments"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <IconPlusSquare className="h-4 w-4" /> Start an assessment
                </Link>
              }
            />
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 font-semibold">Assessment</th>
                    <th className="py-2 font-semibold">Score</th>
                    <th className="py-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 font-bold text-slate-900">{r.label}</td>
                      <td className="py-3">
                        {r.finalPercentage === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <ScoreValue pct={r.finalPercentage} />
                        )}
                      </td>
                      <td className="py-3 text-slate-500">{formatDate(r.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link
                href="/results"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
              >
                View All Assessments <IconArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading>Skill Performance</SectionHeading>
          {data.skillPerformance.length === 0 ? (
            <EmptyState
              icon={<IconChart className="h-8 w-8" />}
              title="No skill data yet"
              message="Skill-level accuracy appears once you complete assessments."
            />
          ) : (
            <>
              <ul className="space-y-4">
                {data.skillPerformance.map((s) => (
                  <li key={s.skillId}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-900">{s.name}</span>
                      <span className="font-bold text-slate-900">{Math.round(s.pct)}%</span>
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar pct={s.pct} label={`${s.name} accuracy`} />
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/results?tab=skills"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
              >
                View All Skills <IconArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
