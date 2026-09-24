"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import {
  createGeneralAssessment,
  parseClientRequestId,
  parseCount,
  parseDifficulty,
  saveAnswer,
  submitGeneralAssessment,
} from "@/lib/assessment/general";

/**
 * GENERAL assessment Server Actions. Identity always comes from
 * requireUser(); the client supplies only configuration choices, selections
 * and the idempotency key — never userId, never scores, never correctness.
 */

export type StartState = {
  error?: string;
  available?: number;
};

export async function startGeneralAssessment(
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const user = await requireUser();

  const areaId = String(formData.get("areaId") ?? "");
  const difficulty = parseDifficulty(String(formData.get("difficulty") ?? ""));
  const count = parseCount(String(formData.get("count") ?? ""));
  const clientRequestId = parseClientRequestId(String(formData.get("clientRequestId") ?? ""));

  if (!areaId || !difficulty || count === null || !clientRequestId) {
    return { error: "Invalid assessment configuration. Please review and try again." };
  }

  const result = await createGeneralAssessment({
    userId: user.id,
    areaId,
    difficulty,
    count,
    clientRequestId,
  });

  if (!result.ok) {
    if (result.reason === "insufficient") {
      return {
        error:
          "Not enough eligible library questions for this configuration. AI gap-fill generation arrives in the AI phase; try a lower question count or another difficulty.",
        available: result.available,
      };
    }
    return { error: "This assessment area is not available. Please pick another area." };
  }
  redirect(`/assessments/take/${result.assessmentId}`);
}

export async function saveAnswerAction(
  assessmentQuestionId: string,
  optionId: string,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const result = await saveAnswer({ userId: user.id, assessmentQuestionId, optionId });
  return { ok: result.ok };
}

export async function submitAssessmentAction(
  assessmentId: string,
): Promise<{ ok: boolean; error?: string; missing?: number; redirect?: string }> {
  const user = await requireUser();
  const result = await submitGeneralAssessment(user.id, assessmentId);
  if (result.ok) return { ok: true, redirect: `/results/${result.assessmentId}` };
  if (result.reason === "already-completed") {
    return { ok: true, redirect: `/results/${result.assessmentId}` };
  }
  if (result.reason === "unanswered") {
    return { ok: false, error: "unanswered", missing: result.missing };
  }
  return { ok: false, error: "This assessment cannot be submitted right now." };
}
