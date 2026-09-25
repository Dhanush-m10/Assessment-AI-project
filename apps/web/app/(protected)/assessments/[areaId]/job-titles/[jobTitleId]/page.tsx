import Link from "next/link";
import { notFound } from "next/navigation";
import { validateRoleContext } from "@/lib/assessment/basic-mcq";
import { Card, EmptyState } from "@/components/ui/card";
import { SetupForm } from "@/components/assessment/setup-form";
import { StepIndicator } from "@/components/ui/step-indicator";
import { CODING_COUNT_MAX } from "@/lib/assessment/limits";
import { IconArrowRight } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment Setup · Assessment AI" };

/**
 * Role-based setup. The DATABASE decides the flow (JobTitle.assessmentFlow):
 * BASIC_MCQ continues to the JD step, BASIC_SKILLS_MCQ to the skills step,
 * anything else shows a coming-soon state. Steps are labelled so the user
 * always knows where they are in the chain.
 */
export default async function JobTitleSetupPage({
  params,
}: {
  params: Promise<{ areaId: string; jobTitleId: string }>;
}) {
  const { areaId, jobTitleId } = await params;
  const result = await validateRoleContext(areaId, jobTitleId);

  if (!result.ok) notFound();
  const { assessmentFlow } = result.context;
  const implemented =
    assessmentFlow === "BASIC_MCQ" ||
    assessmentFlow === "BASIC_SKILLS_MCQ" ||
    assessmentFlow === "CODING";
  const isCoding = assessmentFlow === "CODING";
  const steps =
    assessmentFlow === "BASIC_SKILLS_MCQ" || isCoding
      ? ["Job title", "Setup", "Skills", "Job description", "Preview"]
      : ["Job title", "Setup", "Job description", "Preview"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/assessments/${areaId}/job-titles`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to job titles
      </Link>
      <StepIndicator steps={steps} current={1} />
      <Card className="p-8">
        {implemented ? (
          <>
            <p className="text-sm font-semibold text-blue-600">{result.context.areaName}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              {result.context.jobTitleName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isCoding
                ? "Configure your coding assessment. Challenges are selected from the live coding library for this job title; you will write, run and submit real code against them."
                : assessmentFlow === "BASIC_SKILLS_MCQ"
                  ? "Configure your Basic + Skills assessment. Questions are allocated round-robin across the skills you confirm in the next step."
                  : "Configure your Basic MCQ assessment. Questions are selected from the live library for this job title at your chosen difficulty and experience band."}
            </p>
            <div className="mt-6">
              <SetupForm
                showExperience
                showAdaptive={!isCoding}
                maxCount={isCoding ? CODING_COUNT_MAX : undefined}
                countNoun={isCoding ? "challenges" : "questions"}
                target={{
                  kind: assessmentFlow === "BASIC_SKILLS_MCQ" || isCoding ? "skills" : "jd",
                  base: `/assessments/${areaId}/job-titles/${jobTitleId}`,
                }}
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {result.context.jobTitleName}
            </h1>
            <EmptyState
              className="mt-4"
              title="Coming soon"
              message="This job title runs a flow that is not available in the prototype yet. General, Basic MCQ, Basic + Skills and Coding job titles are available now."
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
