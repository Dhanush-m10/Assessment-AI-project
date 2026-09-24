import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getTakingData } from "@/lib/assessment/general";
import { TakingScreen } from "@/components/assessment/taking";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assessment · Assessment AI" };

/**
 * Taking screen. The server projects immutable snapshots into display-safe
 * views (no correctOptionId, no scoring metadata) and hands them to a client
 * island for navigation/selection. Ownership is enforced in getTakingData's
 * WHERE clause; foreign or completed assessments 404 here (resume route
 * redirects completed ones to results).
 */
export default async function TakePage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireUser();
  const data = await getTakingData(user.id, assessmentId);
  if (!data) notFound();

  return <TakingScreen data={data} />;
}
