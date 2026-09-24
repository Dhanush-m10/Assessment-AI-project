import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import {
  listLibraryJds,
  parseExperience,
  validateRoleContext,
} from "@/lib/assessment/basic-mcq";
import { parseCount, parseDifficulty } from "@/lib/assessment/general";
import { parseCodingCount } from "@/lib/assessment/limits";
import { getPrisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui/card";
import { SkillChip } from "@/components/ui/badges";
import { StepIndicator } from "@/components/ui/step-indicator";
import { JdForm } from "@/components/assessment/jd-form";
import { EXPERIENCE_META } from "@/components/assessment/experience-meta";

export const dynamic = "force-dynamic";

export const metadata = { title: "Job Description · Assessment AI" };

type Skill = { id: string; name: string };

/**
 * JD finalization step (BASIC_MCQ and BASIC_SKILLS_MCQ). Config arrives via
 * searchParams and is re-validated here (difficulty enum, experience enum,
 * count) and again inside the creation action. The flow itself comes from
 * the database, never from the client. For BASIC_SKILLS_MCQ the `skills`
 * param is cross-checked against the job title's own active skills, so ids
 * cannot be injected; unknown ids are dropped and re-checked at creation.
 */
export default async function JdPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string; jobTitleId: string }>;
  searchParams: Promise<{
    difficulty?: string;
    experience?: string;
    count?: string;
    preview?: string;
    skills?: string;
    adaptive?: string;
  }>;
}) {
  const { areaId, jobTitleId } = await params;
  const sp = await searchParams;
  await requireUser();

  const difficulty = parseDifficulty(sp.difficulty ?? "");
  const experience = parseExperience(sp.experience ?? "");
  const preview = sp.preview === "on";
  const adaptive = sp.adaptive === "on";

  const ctxResult = await validateRoleContext(areaId, jobTitleId);
  if (!ctxResult.ok) notFound();
  if (
    ctxResult.context.assessmentFlow !== "BASIC_MCQ" &&
    ctxResult.context.assessmentFlow !== "BASIC_SKILLS_MCQ" &&
    ctxResult.context.assessmentFlow !== "CODING"
  ) {
    notFound();
  }
  const isCoding = ctxResult.context.assessmentFlow === "CODING";
  // CODING follows the same skills -> JD chain as BASIC_SKILLS_MCQ.
  const skillsFlow =
    ctxResult.context.assessmentFlow === "BASIC_SKILLS_MCQ" || isCoding;
  const count = isCoding ? parseCodingCount(sp.count ?? "") : parseCount(sp.count ?? "");

  const setupHref = `/assessments/${areaId}/job-titles/${jobTitleId}`;
  const configQuery = `difficulty=${sp.difficulty ?? ""}&experience=${sp.experience ?? ""}&count=${sp.count ?? ""}&preview=${preview ? "on" : "off"}&adaptive=${adaptive ? "on" : "off"}`;
  const backHref = skillsFlow
    ? `/assessments/${areaId}/job-titles/${jobTitleId}/skills?${configQuery}`
    : setupHref;

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

  const requestedSkillIds = skillsFlow
    ? (sp.skills ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  const selectedSkills: Skill[] = requestedSkillIds.length
    ? ((await getPrisma().skill.findMany({
        where: {
          id: { in: requestedSkillIds },
          isActive: true,
          jobTitleSkills: { some: { jobTitleId } },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })) as Skill[])
    : [];
  const skillIdsParam = selectedSkills.map((s) => s.id).join(",");

  const jds = await listLibraryJds(jobTitleId, experience);
  const experienceLabel =
    EXPERIENCE_META.find((e) => e.value === experience)?.label ?? experience;

  const steps = skillsFlow
    ? ["Job title", "Setup", "Skills", "Job description", "Preview"]
    : ["Job title", "Setup", "Job description", "Preview"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        {skillsFlow ? "Back to skills" : "Back to setup"}
      </Link>
      <StepIndicator steps={steps} current={steps.length - 2} />
      <Card className="p-8">
        <p className="text-sm font-semibold text-blue-600">{ctxResult.context.areaName}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {ctxResult.context.jobTitleName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isCoding
            ? "Finalize the job description your coding assessment is based on. Its skills prioritise which challenges are selected."
            : "Finalize the job description your assessment is based on."}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Difficulty</dt>
            <dd className="font-bold text-slate-900">
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Experience</dt>
            <dd className="font-bold text-slate-900">{experienceLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{isCoding ? "Challenges" : "Questions"}</dt>
            <dd className="font-bold text-slate-900">{count}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Preview</dt>
            <dd className="font-bold text-slate-900">{adaptive ? "—" : preview ? "On" : "Off"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Mode</dt>
            <dd className="font-bold text-slate-900">{adaptive ? "Adaptive" : "Standard"}</dd>
          </div>
        </dl>

        {selectedSkills.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500">
              {isCoding
                ? "Prioritised skills — challenges tagged with these skills are selected first (then job-description and job-title skills):"
                : "Prioritised skills — questions are split evenly across your final skill set (selected first, then job-description and job-title skills):"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSkills.map((s) => (
                <SkillChip key={s.id}>{s.name}</SkillChip>
              ))}
            </div>
          </div>
        )}

        {jds.length === 0 && (
          <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            No library JDs exist for this job title at {experienceLabel} — paste the JD text
            below to continue.
          </p>
        )}

        <div className="mt-6">
          <JdForm
            areaId={areaId}
            jobTitleId={jobTitleId}
            difficulty={difficulty}
            experience={experience}
            count={count}
            preview={preview}
            jds={jds}
            skillIds={skillIdsParam}
            adaptive={adaptive}
          />
        </div>
      </Card>
    </div>
  );
}
