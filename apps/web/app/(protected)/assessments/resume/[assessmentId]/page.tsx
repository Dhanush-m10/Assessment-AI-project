import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/prisma";
import { bandLabel } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui/card";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Resume Assessment · Assessment AI" };

/**
 * Resume entry point for an open (non-completed) assessment.
 *
 * Ownership is enforced in the WHERE clause (id + session userId) — another
 * user's assessment id renders 404, never data. The actual taking screen is a
 * later phase; this page states that plainly instead of faking it.
 */
export default async function ResumePage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireUser();

  const assessment = await getPrisma().assessment.findFirst({
    where: { id: assessmentId, userId: user.id },
    select: {
      id: true,
      status: true,
      difficulty: true,
      experienceBand: true,
      requestedQuestionCount: true,
      areaOfInterest: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  if (!assessment) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back
      </Link>
      <Card className="p-8">
        <p className="text-sm font-semibold text-blue-600">{assessment.category.name}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {assessment.areaOfInterest.name}
        </h1>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-bold text-slate-900">{assessment.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Difficulty</dt>
            <dd className="font-bold text-slate-900">{assessment.difficulty}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Experience</dt>
            <dd className="font-bold text-slate-900">{bandLabel(assessment.experienceBand)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Questions</dt>
            <dd className="font-bold text-slate-900">{assessment.requestedQuestionCount}</dd>
          </div>
        </dl>
        <EmptyState
          className="mt-6"
          title="Taking screen arrives next phase"
          message="Question display, answering and submission (selection engine + scoring) are implemented in the assessment phases. Your progress is safely stored."
        />
        <Link
          href="/assessments"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
        >
          Browse other assessments <IconArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
