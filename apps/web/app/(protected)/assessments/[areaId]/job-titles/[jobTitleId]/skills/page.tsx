import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { listTitleSkills, parseExperience, validateRoleContext } from "@/lib/assessment/basic-mcq";
import { parseCount, parseDifficulty } from "@/lib/assessment/general";
import { parseCodingCount } from "@/lib/assessment/limits";
import { Card, EmptyState } from "@/components/ui/card";
import { StepIndicator } from "@/components/ui/step-indicator";
import { SkillsForm } from "@/components/assessment/skills-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Skill Selection · Assessment AI" };

/**
 * BASIC_SKILLS_MCQ only: choose which of the job title's normalized skills
 * to prioritise. Config arrives from the setup step and is re-validated here.
 * The selection travels to the JD step as a query parameter; every id is
 * cross-checked against the job title again at creation time, so users can
 * never inject skills that are not owned by the title.
 */
export default async function SkillSelectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string; jobTitleId: string }>;
  searchParams: Promise<{
    difficulty?: string;
    experience?: string;
    count?: string;
    preview?: string;
  }>;
}) {
  const { areaId, jobTitleId } = await params;
  const sp = await searchParams;
  await requireUser();

  const ctxResult = await validateRoleContext(areaId, jobTitleId);
  if (!ctxResult.ok) notFound();
  const flow = ctxResult.context.assessmentFlow;
  if (flow !== "BASIC_SKILLS_MCQ" && flow !== "CODING") notFound();
  const isCoding = flow === "CODING";

  const setupHref = `/assessments/${areaId}/job-titles/${jobTitleId}`;
  const difficulty = parseDifficulty(sp.difficulty ?? "");
  const experience = parseExperience(sp.experience ?? "");
  const count = isCoding ? parseCodingCount(sp.count ?? "") : parseCount(sp.count ?? "");
  const preview = sp.preview === "on";

  if (!difficulty || !experience || count === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <EmptyState
            title="Invalid configuration"
            message="Difficulty, experience band and question count must be valid. Please configure the assessment again."
            action={
              <Link
                href={setupHref}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Back to setup
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const skills = await listTitleSkills(jobTitleId);
  const configQuery = `difficulty=${difficulty}&experience=${experience}&count=${count}&preview=${preview ? "on" : "off"}`;
  const jdHref = `/assessments/${areaId}/job-titles/${jobTitleId}/jd?${configQuery}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={setupHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to setup
      </Link>
      <StepIndicator
        steps={["Job title", "Setup", "Skills", "Job description", "Preview"]}
        current={2}
      />
      <Card className="p-8">
        <p className="text-sm font-semibold text-blue-600">{ctxResult.context.areaName}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {ctxResult.context.jobTitleName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isCoding
            ? `Choose the skills you want prioritised. Your ${count} coding challenge${count === 1 ? "" : "s"} will favour challenges tagged with these skills, then skills from the job description you pick next, then the job title's configured skills.`
            : `Choose the skills you want prioritised. Your ${count} questions will be split evenly across the final skill set — selected skills first, then skills from the job description you pick next, then the job title's configured skills.`}
        </p>

        {skills.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No skills configured for this job title"
            message="Continue to the job description step — skills attached to the job description you choose will define the assessment coverage."
            action={
              <Link
                href={jdHref}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue to job description
              </Link>
            }
          />
        ) : (
          <SkillsForm skills={skills} action={jdHref} />
        )}
      </Card>
    </div>
  );
}
