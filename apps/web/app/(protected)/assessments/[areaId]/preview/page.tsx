import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { parseCount, parseDifficulty, selectEligibleQuestions } from "@/lib/assessment/general";
import { requireUser } from "@/lib/auth/require-user";
import { Card, EmptyState } from "@/components/ui/card";
import { StartForm } from "@/components/assessment/start-form";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Preview Assessment · Assessment AI" };

/**
 * Preview/confirm step. Reads config from searchParams and RE-VALIDATES it
 * server-side (difficulty enum, 1–50 count, LIVE General area). Shows the
 * eligible pool size so an insufficient library is surfaced BEFORE creation.
 * No Assessment row exists until Start is pressed, so refreshing preview can
 * never create duplicates (idempotency at creation is clientRequestId).
 */
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ difficulty?: string; count?: string; preview?: string }>;
}) {
  const { areaId } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const difficulty = parseDifficulty(sp.difficulty ?? "");
  const count = parseCount(sp.count ?? "");
  const preview = sp.preview === "on";

  const area = (await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId, status: "LIVE", classification: "GENERAL", category: { status: "LIVE" } },
    select: { id: true, name: true, category: { select: { name: true } } },
  })) as { id: string; name: string; category: { name: string } } | null;
  if (!area) notFound();

  if (!difficulty || count === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <EmptyState
            title="Invalid configuration"
            message="Difficulty must be Easy, Medium or Hard and the question count must be between 1 and 50."
            action={
              <Link
                href={`/assessments/${area.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Back to setup <IconArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const eligible = await selectEligibleQuestions({ userId: user.id, areaId: area.id, difficulty });
  const insufficient = eligible.length < count;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/assessments/${area.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to setup
      </Link>
      <Card className="p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Preview your assessment
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Check the configuration, then start. Questions are drawn from the live library at
          submit-safe difficulty; recently mastered questions are rotated out automatically.
        </p>

        <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {[
            ["Area", area.name],
            ["Category", area.category.name],
            ["Difficulty", difficulty.charAt(0) + difficulty.slice(1).toLowerCase()],
            ["Questions", String(count)],
            ["Flow", "General"],
            ["Preview", preview ? "On" : "Off"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-3 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {insufficient ? (
          <EmptyState
            className="mt-6"
            title="Not enough eligible library questions"
            message={`Only ${eligible.length} live question${eligible.length === 1 ? "" : "s"} match this configuration after the 30-day rotation rule. AI gap-fill generation arrives in the AI phase — for now, lower the question count or change difficulty.`}
            action={
              <Link
                href={`/assessments/${area.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Adjust configuration <IconArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <div className="mt-6">
            <StartForm areaId={area.id} difficulty={difficulty} count={count} preview={preview} />
          </div>
        )}
      </Card>
    </div>
  );
}
