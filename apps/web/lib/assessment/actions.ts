"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import {
  createGeneralAssessment,
  parseClientRequestId,
  parseCount,
  parseDifficulty,
  saveAnswer,
  submitMcqAssessment,
} from "@/lib/assessment/general";
import {
  createBasicMcqAssessment,
  parseExperience,
  type JdChoice,
} from "@/lib/assessment/basic-mcq";
import { replaceQuestion, startFromPreview } from "@/lib/assessment/engine";

/**
 * Assessment Server Actions (GENERAL + BASIC_MCQ). Identity always comes from
 * requireUser(); the client supplies only configuration choices, selections,
 * JD choices and the idempotency key — never userId, never scores, never
 * correctness, never taxonomy ownership.
 */

export type StartState = {
  error?: string;
  available?: number;
};

const INSUFFICIENT_MSG =
  "Not enough eligible library questions for this configuration. AI gap-fill generation arrives in the AI phase; try a lower question count or another difficulty.";

export async function startGeneralAssessment(
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const user = await requireUser();

  const areaId = String(formData.get("areaId") ?? "");
  const difficulty = parseDifficulty(String(formData.get("difficulty") ?? ""));
  const count = parseCount(String(formData.get("count") ?? ""));
  const previewEnabled = formData.get("preview") === "on";
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
    previewEnabled,
  });

  if (!result.ok) {
    if (result.reason === "insufficient") {
      return { error: INSUFFICIENT_MSG, available: result.available };
    }
    return { error: "This assessment area is not available. Please pick another area." };
  }
  redirect(
    result.status === "PREVIEW"
      ? `/assessments/preview/${result.assessmentId}`
      : `/assessments/take/${result.assessmentId}`,
  );
}

export async function startBasicMcqAssessment(
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const user = await requireUser();

  const areaId = String(formData.get("areaId") ?? "");
  const jobTitleId = String(formData.get("jobTitleId") ?? "");
  const difficulty = parseDifficulty(String(formData.get("difficulty") ?? ""));
  const experience = parseExperience(String(formData.get("experience") ?? ""));
  const count = parseCount(String(formData.get("count") ?? ""));
  const previewEnabled = formData.get("preview") === "on";
  const clientRequestId = parseClientRequestId(String(formData.get("clientRequestId") ?? ""));

  if (!areaId || !jobTitleId || !difficulty || !experience || count === null || !clientRequestId) {
    return { error: "Invalid assessment configuration. Please review and try again." };
  }

  const jdMode = String(formData.get("jdMode") ?? "");
  let jd: JdChoice;
  if (jdMode === "LIBRARY") {
    jd = { source: "LIBRARY", jdId: String(formData.get("jdId") ?? "") };
  } else if (jdMode === "USER_PASTED") {
    jd = { source: "USER_PASTED", content: String(formData.get("jdContent") ?? "") };
  } else {
    return { error: "Choose a job description from the library or paste one." };
  }

  const result = await createBasicMcqAssessment({
    userId: user.id,
    areaId,
    jobTitleId,
    difficulty,
    experience,
    count,
    previewEnabled,
    jd,
    clientRequestId,
  });

  if (!result.ok) {
    if (result.reason === "insufficient") {
      return { error: INSUFFICIENT_MSG, available: result.available };
    }
    if (result.reason === "invalid-jd") {
      return { error: result.message };
    }
    return {
      error:
        "This job title or area is not available for Basic MCQ assessments. Please choose another.",
    };
  }
  redirect(
    result.status === "PREVIEW"
      ? `/assessments/preview/${result.assessmentId}`
      : `/assessments/take/${result.assessmentId}`,
  );
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
  const result = await submitMcqAssessment(user.id, assessmentId);
  if (result.ok) return { ok: true, redirect: `/results/${result.assessmentId}` };
  if (result.reason === "already-completed") {
    return { ok: true, redirect: `/results/${result.assessmentId}` };
  }
  if (result.reason === "unanswered") {
    return { ok: false, error: "unanswered", missing: result.missing };
  }
  return { ok: false, error: "This assessment cannot be submitted right now." };
}

/** Preview-only question replacement (shared engine, all flows). */
export async function replaceQuestionAction(
  assessmentQuestionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const result = await replaceQuestion(user.id, assessmentQuestionId);
  if (result.ok) return { ok: true };
  if (result.reason === "ai-required") {
    return {
      ok: false,
      error:
        "No eligible replacement question remains in the library for this configuration. AI-generated replacements arrive in the AI phase.",
    };
  }
  return { ok: false, error: "This question can no longer be replaced." };
}

/** PREVIEW -> IN_PROGRESS transition (Start Test). */
export async function startFromPreviewAction(
  assessmentId: string,
): Promise<{ ok: boolean; redirect?: string }> {
  const user = await requireUser();
  const result = await startFromPreview(user.id, assessmentId);
  if (!result.ok) return { ok: false };
  return { ok: true, redirect: result.redirect };
}
