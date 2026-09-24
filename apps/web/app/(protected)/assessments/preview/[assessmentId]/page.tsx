import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getPreviewData } from "@/lib/assessment/engine";
import { getPrisma } from "@/lib/prisma";
import { PreviewScreen } from "@/components/assessment/preview-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Preview · Assessment AI" };

/**
 * Question preview (Preview ON). Only PREVIEW-status assessments render here;
 * IN_PROGRESS goes to the taking screen and COMPLETED to results, so refresh
 * and bookmarked URLs always land on the right step. Ownership is enforced
 * inside both lookups (foreign ids 404).
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireUser();

  const data = await getPreviewData(user.id, assessmentId);
  if (data) return <PreviewScreen data={data} />;

  const status = (await getPrisma().assessment.findFirst({
    where: { id: assessmentId, userId: user.id },
    select: { status: true },
  })) as { status: string } | null;
  if (!status) notFound();
  if (status.status === "IN_PROGRESS") redirect(`/assessments/take/${assessmentId}`);
  redirect(`/results/${assessmentId}`);
}
