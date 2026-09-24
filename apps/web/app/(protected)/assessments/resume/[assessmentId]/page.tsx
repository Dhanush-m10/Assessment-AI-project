import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Resume entry point. Ownership is checked in the WHERE clause (foreign or
 * unknown ids 404 — never revealed). COMPLETED assessments go straight to
 * their result; IN_PROGRESS goes to the taking screen. ABANDONED is reserved
 * (D-ABANDON) and never auto-set, so other open statuses fall back to the
 * catalogue for re-configuration.
 */
export default async function ResumePage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireUser();

  const assessment = (await getPrisma().assessment.findFirst({
    where: { id: assessmentId, userId: user.id },
    select: { id: true, status: true },
  })) as { id: string; status: string } | null;
  if (!assessment) notFound();

  if (assessment.status === "COMPLETED") redirect(`/results/${assessment.id}`);
  if (assessment.status === "PREVIEW") redirect(`/assessments/preview/${assessment.id}`);
  if (assessment.status === "IN_PROGRESS") redirect(`/assessments/take/${assessment.id}`);
  redirect("/assessments");
}
