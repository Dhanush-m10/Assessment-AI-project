import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { AreaCardBanner } from "@/components/ui/area-card";
import { Card, EmptyState } from "@/components/ui/card";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment Setup · Assessment AI" };

/**
 * Per-area setup entry placeholder. Reads the real area (LIVE only) so the
 * card the user clicked is echoed faithfully; the configuration flow
 * (difficulty, counts, preview, JD/skills steps per flow) arrives in the
 * setup phases. No generation logic lives here.
 */
export default async function AreaSetupPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;

  const area = await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId, status: "LIVE", category: { status: "LIVE" } },
    select: {
      id: true,
      name: true,
      classification: true,
      category: { select: { name: true } },
      _count: { select: { jobTitles: true } },
    },
  });
  if (!area) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back
      </Link>
      <Card className="overflow-hidden">
        <AreaCardBanner id={area.id} className="rounded-none h-44" />
        <div className="p-8">
          <p className="text-sm font-semibold text-blue-600">{area.category.name}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            {area.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {area.classification === "ROLE_BASED"
              ? `Role-based track · ${area._count.jobTitles} job titles available`
              : "General track · straight to assessment setup"}
          </p>
          <EmptyState
            className="mt-6"
            title="Setup flow arrives in the next phase"
            message="Difficulty, question count, preview and (for role-based tracks) job title, JD and skill steps will be configured here, then the selection engine generates the assessment."
          />
          <Link
            href="/assessments"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
          >
            Choose a different area <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
