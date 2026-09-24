import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import {
  listLibraryJds,
  parseExperience,
  validateBasicContext,
} from "@/lib/assessment/basic-mcq";
import { parseCount, parseDifficulty } from "@/lib/assessment/general";
import { Card, EmptyState } from "@/components/ui/card";
import { JdForm } from "@/components/assessment/jd-form";
import { EXPERIENCE_META } from "@/components/assessment/experience-meta";

export const dynamic = "force-dynamic";

export const metadata = { title: "Job Description · Assessment AI" };

/**
 * JD finalization step for Basic MCQ. Config arrives via searchParams and is
 * re-validated here (difficulty enum, experience enum, count 1–50) and again
 * inside the creation action. Library JDs are filtered by job title +
 * experience band + LIVE; skills are shown from JobDescriptionSkill.
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
  }>;
}) {
  const { areaId, jobTitleId } = await params;
  const sp = await searchParams;
  await requireUser();

  const difficulty = parseDifficulty(sp.difficulty ?? "");
  const experience = parseExperience(sp.experience ?? "");
  const count = parseCount(sp.count ?? "");
  const preview = sp.preview === "on";

  const ctxResult = await validateBasicContext(areaId, jobTitleId);
  if (!ctxResult.ok && ctxResult.reason !== "wrong-flow") notFound();

  const setupHref = `/assessments/${areaId}/job-titles/${jobTitleId}`;

  if (!ctxResult.ok || !difficulty || !experience || count === null) {
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

  const jds = await listLibraryJds(jobTitleId, experience);
  const experienceLabel =
    EXPERIENCE_META.find((e) => e.value === experience)?.label ?? experience;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={setupHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
      >
        Back to setup
      </Link>
      <Card className="p-8">
        <p className="text-sm font-semibold text-blue-600">{ctxResult.context.areaName}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {ctxResult.context.jobTitleName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Finalize the job description your assessment is based on.
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
            <dt className="text-slate-500">Questions</dt>
            <dd className="font-bold text-slate-900">{count}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Preview</dt>
            <dd className="font-bold text-slate-900">{preview ? "On" : "Off"}</dd>
          </div>
        </dl>

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
          />
        </div>
      </Card>
    </div>
  );
}
