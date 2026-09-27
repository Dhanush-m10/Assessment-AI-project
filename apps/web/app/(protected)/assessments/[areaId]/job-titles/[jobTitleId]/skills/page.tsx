import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { listTitleSkills, parseExperience, validateRoleContext } from "@/lib/assessment/basic-mcq";
import { parseCount, parseDifficulty } from "@/lib/assessment/general";
import { parseCodingCount } from "@/lib/assessment/limits";
import { Card, EmptyState } from "@/components/ui/card";
import { StepIndicator } from "@/components/ui/step-indicator";
import { SkillsForm } from "@/components/assessment/skills-form";
import { ConfigSummary } from "@/components/assessment/config-summary";

export const dynamic = "force-dynamic";

export const metadata = { title: "Skill Selection · Assessment AI" };

/**
 * Skill step. BASIC_SKILLS_MCQ: choose which of the job title's normalized
 * skills to prioritise, then continue to the JD step. CODING: this is the
 * FINALIZE step — no JD for coding; submitting creates the assessment
 * directly (preview -> take), skipping the JD step entirely. Config arrives
 * from the setup step and is re-validated here and again in the creation
 * action; every skill id is cross-checked against the job title at creation
 * time, so users can never inject skills the title does not own.
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
    adaptive?: string;
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
  const adaptive = sp.adaptive === "on";
  const configQuery = `difficulty=${difficulty}&experience=${experience}&count=${count}&preview=${preview ? "on" : "off"}&adaptive=${adaptive ? "on" : "off"}`;
  const jdHref = `/assessments/${areaId}/job-titles/${jobTitleId}/jd?${configQuery}`;
  const createProps = { areaId, jobTitleId, difficulty, experience, count, preview };
  const steps = isCoding
    ? ["Job title", "Setup", "Skills", "Preview"]
    : ["Job title", "Setup", "Skills", "Job description", "Preview"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={setupHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to setup
      </Link>
      <StepIndicator steps={steps} current={2} />
      <Card className="p-8">
        <p className="text-sm font-semibold text-blue-600">{ctxResult.context.areaName}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {ctxResult.context.jobTitleName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isCoding
            ? `Choose the skills you want prioritised. Your ${count} coding challenge${count === 1 ? "" : "s"} will favour challenges tagged with these skills, then the job title's configured skills.`
            : `Choose the skills you want prioritised. Your ${count} questions will be split evenly across the final skill set — selected skills first, then skills from the job description you pick next, then the job title's configured skills.`}
        </p>

        {isCoding && (
          <ConfigSummary
            difficulty={difficulty}
            experience={experience}
            count={count}
            preview={preview}
            countNoun="Challenges"
          />
        )}

        {skills.length === 0 ? (
          isCoding ? (
            <>
              <p className="mt-5 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                No skills configured for this job title — challenges will be selected from the
                coding library for this role.
              </p>
              <SkillsForm skills={[]} create={createProps} />
            </>
          ) : (
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
          )
        ) : (
          isCoding ? (
            <SkillsForm skills={skills} create={createProps} />
          ) : (
            <SkillsForm skills={skills} action={jdHref} />
          )
        )}
      </Card>
    </div>
  );
}
