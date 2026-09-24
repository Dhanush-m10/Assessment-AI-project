import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/card";
import { FlowBadge } from "@/components/ui/badges";
import { IconArrowRight, IconMedal } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Job Titles · Assessment AI" };

/**
 * Job Title selection for a LIVE ROLE_BASED area. Titles come exclusively
 * from the database; every LIVE title links to its flow (all four flows are
 * implemented). Unknown future flows fall back to a coming-soon card in the
 * setup step — no dead links, no fakes.
 */
export default async function JobTitlesPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;

  const area = (await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId, status: "LIVE", classification: "ROLE_BASED" },
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
      jobTitles: {
        where: { status: "LIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, assessmentFlow: true },
      },
    },
  })) as {
    id: string;
    name: string;
    category: { name: string };
    jobTitles: { id: string; name: string; assessmentFlow: string }[];
  } | null;
  if (!area) notFound();

  const cardBody = (t: { name: string; assessmentFlow: string }) => (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-slate-900">{t.name}</p>
        <IconArrowRight className="h-4 w-4 shrink-0 text-blue-600 transition-transform duration-200 motion-safe:group-hover:translate-x-1" />
      </div>
      <div className="mt-3">
        <FlowBadge flow={t.assessmentFlow} />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
        >
          Back
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          {area.name}
        </h1>
        <p className="mt-2 text-slate-500">
          {area.category.name} · choose the job title you want to be assessed for.
        </p>
      </div>

      {area.jobTitles.length === 0 ? (
        <EmptyState
          icon={<IconMedal className="h-8 w-8" />}
          title="No published job titles yet"
          message="Job titles for this area appear here once an administrator publishes them."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {area.jobTitles.map((t) => (
            <Link
              key={t.id}
              href={`/assessments/${area.id}/job-titles/${t.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg"
            >
              {cardBody(t)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
