import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { AreaCardBanner } from "@/components/ui/area-card";
import { Card, EmptyState } from "@/components/ui/card";
import { SetupForm } from "@/components/assessment/setup-form";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment Setup · Assessment AI" };

/**
 * GENERAL assessment setup (Phase 4). The area is loaded server-side and must
 * exist, be LIVE and belong to the General track (classification GENERAL) —
 * a client can never invent an area. ROLE_BASED areas show a scope message
 * (their flows arrive later); nothing here accepts client-supplied taxonomy.
 */
export default async function AreaSetupPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;

  const area = (await getPrisma().areaOfInterest.findFirst({
    where: { id: areaId },
    select: {
      id: true,
      name: true,
      status: true,
      classification: true,
      category: { select: { name: true, status: true } },
    },
  })) as {
    id: string;
    name: string;
    status: string;
    classification: string;
    category: { name: string; status: string };
  } | null;
  if (!area) notFound();

  const live = area.status === "LIVE" && area.category.status === "LIVE";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back
      </Link>
      <Card className="overflow-hidden">
        <AreaCardBanner id={area.id} className="rounded-none h-40" />
        <div className="p-8">
          <p className="text-sm font-semibold text-blue-600">{area.category.name}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            {area.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure your general assessment below. Questions are selected from the live
            library at your chosen difficulty.
          </p>

          {!live ? (
            <EmptyState
              className="mt-6"
              title="This area is not available"
              message="Only published (LIVE) assessment areas can be started. Please pick another area from the catalogue."
              action={
                <Link
                  href="/assessments"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Browse assessments <IconArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : area.classification !== "GENERAL" ? (
            <EmptyState
              className="mt-6"
              title="Role-based track"
              message="This area runs through job-title, JD and skill-based flows, which arrive after the General vertical slice. General areas are available now."
              action={
                <Link
                  href="/assessments"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Browse assessments <IconArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : (
            <div className="mt-6">
              <SetupForm areaId={area.id} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
