import Link from "next/link";
import { notFound } from "next/navigation";
import { validateBasicContext } from "@/lib/assessment/basic-mcq";
import { Card, EmptyState } from "@/components/ui/card";
import { SetupForm } from "@/components/assessment/setup-form";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Basic MCQ Setup · Assessment AI" };

/**
 * Basic MCQ setup for one database-validated job title. validateBasicContext
 * re-checks the whole chain (area LIVE + ROLE_BASED, title LIVE + belongs to
 * area + flow BASIC_MCQ) — titles configured for other flows get a scope
 * card instead of a setup form.
 */
export default async function JobTitleSetupPage({
  params,
}: {
  params: Promise<{ areaId: string; jobTitleId: string }>;
}) {
  const { areaId, jobTitleId } = await params;
  const result = await validateBasicContext(areaId, jobTitleId);

  // Unknown area/title pairs 404; known-but-wrong-flow gets the scope card.
  if (!result.ok && result.reason === "invalid-area") notFound();
  if (!result.ok && result.reason === "invalid-job-title") notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/assessments/${areaId}/job-titles`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to job titles
      </Link>
      <Card className="p-8">
        {result.ok ? (
          <>
            <p className="text-sm font-semibold text-blue-600">{result.context.areaName}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              {result.context.jobTitleName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Configure your Basic MCQ assessment. Questions are selected from the live
              library for this job title at your chosen difficulty and experience band.
            </p>
            <div className="mt-6">
              <SetupForm
                showExperience
                hrefFor={(p) =>
                  `/assessments/${areaId}/job-titles/${jobTitleId}/jd?difficulty=${p.difficulty}&experience=${p.experience}&count=${p.count}&preview=${p.preview ? "on" : "off"}`
                }
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Not available in this flow
            </h1>
            <EmptyState
              className="mt-4"
              title="Different assessment flow"
              message="This job title is configured for another assessment flow (skills-based or coding), which arrives in a later phase. Basic MCQ job titles are available now."
              action={
                <Link
                  href={`/assessments/${areaId}/job-titles`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Choose another job title <IconArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          </>
        )}
      </Card>
    </div>
  );
}
