import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getAssessmentResult } from "@/lib/queries/candidate";
import { bandLabel, formatDate } from "@/lib/format";
import { Card, EmptyState, ProgressBar, ScoreValue } from "@/components/ui/card";
import { IconChart } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Result · Assessment AI" };

/**
 * Single assessment result. Ownership is enforced inside the query
 * (WHERE id AND userId): foreign ids 404. Only display-safe fields are read —
 * questionSnapshot never leaves the server.
 */
export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const result = await getAssessmentResult(user.id, id);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/results"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back
      </Link>

      <Card className="p-8">
        <p className="text-sm font-semibold text-blue-600">{result.categoryName}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {result.areaName}
        </h1>
        {result.jobTitleName && (
          <p className="mt-1 text-sm text-slate-500">{result.jobTitleName}</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Score</dt>
            <dd className="mt-0.5 text-lg">
              {result.finalPercentage === null ? (
                <span className="font-bold text-slate-400">—</span>
              ) : (
                <ScoreValue pct={result.finalPercentage} />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-0.5 font-bold text-slate-900">{result.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Difficulty</dt>
            <dd className="mt-0.5 font-bold text-slate-900">{result.difficulty}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Date</dt>
            <dd className="mt-0.5 font-bold text-slate-900">
              {formatDate(result.completedAt ?? result.createdAt)}
            </dd>
          </div>
        </div>

        {result.status === "COMPLETED" ? (
          <>
            <p className="mt-6 text-sm text-slate-600">
              {result.correct} of {result.total} answered questions correct
              {result.experienceBand ? ` · ${bandLabel(result.experienceBand)}` : ""}.
            </p>
            {result.perSkill.length > 0 && (
              <ul className="mt-6 space-y-4">
                {result.perSkill.map((s) => (
                  <li key={s.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-900">{s.name}</span>
                      <span className="text-slate-600">
                        {s.correct}/{s.total}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar
                        pct={s.total ? (s.correct / s.total) * 100 : 0}
                        label={`${s.name} accuracy`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-slate-700">
              The full question-by-question breakdown arrives with the scoring phase.
            </p>
          </>
        ) : (
          <EmptyState
            className="mt-6"
            icon={<IconChart className="h-8 w-8" />}
            title="Assessment not completed yet"
            message="Scores and per-skill accuracy appear here once this assessment is submitted and scored."
            action={
              <Link
                href={`/assessments/resume/${result.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue assessment
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}
