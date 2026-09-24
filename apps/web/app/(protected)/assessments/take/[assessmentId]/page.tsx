import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getTakingData } from "@/lib/assessment/general";
import { getCodingTakingData } from "@/lib/assessment/coding";
import { TakingScreen } from "@/components/assessment/taking";
import { CodingTakingScreen } from "@/components/assessment/coding-taking";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment · Assessment AI" };

/**
 * Taking screen (flow-aware). The server projects immutable snapshots into
 * display-safe views — MCQ: no correctOptionId; CODING: no hidden tests, no
 * expected outputs beyond PUBLIC samples — and hands them to a client island.
 * Ownership is enforced in the queries' WHERE clauses; foreign or completed
 * assessments 404 here (resume route redirects completed ones to results).
 */
export default async function TakePage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireUser();

  const assessment = (await getPrisma().assessment.findFirst({
    where: { id: assessmentId, userId: user.id, status: "IN_PROGRESS" },
    select: { flow: true },
  })) as { flow: string } | null;
  if (!assessment) notFound();

  if (assessment.flow === "CODING") {
    const data = await getCodingTakingData(user.id, assessmentId);
    if (!data) notFound();
    return <CodingTakingScreen data={data} />;
  }

  const data = await getTakingData(user.id, assessmentId);
  if (!data) notFound();
  return <TakingScreen data={data} />;
}
