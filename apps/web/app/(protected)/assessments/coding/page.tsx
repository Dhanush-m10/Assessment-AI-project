import Link from "next/link";
import { getCodingTrack } from "@/lib/queries/candidate";
import { Card, EmptyState } from "@/components/ui/card";
import { FlowBadge } from "@/components/ui/badges";
import { IconArrowRight, IconCode, IconPlusDashed } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "DSA & Coding · Assessment AI" };

/**
 * DSA & Coding track (Phase C0): lists every LIVE role that runs the CODING
 * flow. Each card links into the EXISTING job-title setup chain
 * (setup → skills → JD → start → sandbox) — nothing here duplicates the
 * creation flow. All data is database-sourced; an empty track renders a
 * designed empty state instead of a dead CTA.
 */
export default async function CodingTrackPage() {
  const track = await getCodingTrack();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to assessments
      </Link>

      <section className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
        >
          <IconCode className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            DSA &amp; Coding
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Solve programming and data-structure challenges with real code
            execution. Pick a role to configure your assessment — you will
            write, run and submit real code against live challenges.
          </p>
        </div>
      </section>

      {track.jobTitles.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<IconPlusDashed className="h-8 w-8" />}
            title="No coding roles published yet"
            message="Coding assessments appear here as soon as an administrator publishes coding job titles."
            action={
              <Link
                href="/assessments"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Browse all assessments <IconArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {track.jobTitles.map((t) => (
            <Link
              key={t.id}
              href={`/assessments/${t.areaId}/job-titles/${t.id}`}
              className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-safe:group-hover:-translate-y-0.5"
            >
              <div>
                <p className="font-bold text-slate-900">{t.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {t.areaName} · {t.categoryName}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <FlowBadge flow="CODING" />
                <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
                  Start
                  <IconArrowRight className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
