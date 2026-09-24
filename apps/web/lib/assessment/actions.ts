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
  createAdaptiveAssessment,
  createRoleAssessment,
  parseExperience,
  type JdChoice,
} from "@/lib/assessment/basic-mcq";
import { answerAdaptiveQuestion, type AdaptiveTakingData } from "@/lib/assessment/adaptive";
import { replaceQuestion, startFromPreview } from "@/lib/assessment/engine";
import {
  runCodingCode,
  submitCodingAssessment,
  submitCodingQuestion,
  type RunCodeResult,
  type SubmitCodeResult,
} from "@/lib/assessment/coding";
import { getPrisma } from "@/lib/prisma";

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

  const selectedSkillIds = String(formData.get("skillIds") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  // Adaptive V1: optional mode layered on the BASIC_MCQ / BASIC_SKILLS_MCQ
  // flows. The flag is a configuration choice only — every adaptive rule
  // (skills, difficulty walk, selection) is enforced server-side.
  const adaptive = formData.get("adaptive") === "on";
  const createArgs = {
    userId: user.id,
    areaId,
    jobTitleId,
    difficulty,
    experience,
    count,
    previewEnabled,
    jd,
    clientRequestId,
    selectedSkillIds,
  };
  const result = adaptive
    ? await createAdaptiveAssessment(createArgs)
    : await createRoleAssessment(createArgs);

  if (!result.ok) {
    if (result.reason === "insufficient") {
      return { error: INSUFFICIENT_MSG, available: result.available };
    }
    if (result.reason === "invalid-jd" || result.reason === "invalid-config") {
      return { error: result.message };
    }
    if (result.reason === "unsupported-flow") {
      return { error: "This job title runs a flow that is not available yet." };
    }
    return {
      error:
        "This job title or area is not available for this assessment flow. Please choose another.",
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
  // Flow-aware dispatch: coding assessments aggregate server-executed
  // attempts; MCQ flows keep the existing snapshot re-scoring path.
  const assessment = (await getPrisma().assessment.findFirst({
    where: { id: assessmentId, userId: user.id },
    select: { flow: true },
  })) as { flow: string } | null;
  const result =
    assessment?.flow === "CODING"
      ? await submitCodingAssessment(user.id, assessmentId)
      : await submitMcqAssessment(user.id, assessmentId);
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

/**
 * Run Code (CODING): executes the candidate's code against PUBLIC sample
 * tests only. Identity/ownership/question-kind are validated server-side;
 * the browser sends code and nothing else.
 */
export async function runCodeAction(
  assessmentQuestionId: string,
  code: string,
): Promise<RunCodeResult> {
  const user = await requireUser();
  return runCodingCode(user.id, assessmentQuestionId, code);
}

/**
 * Submit Code (per coding question): server executes ALL tests (public +
 * hidden), decides pass/fail (D-CODE all-or-nothing) and persists the
 * attempt. The client never reports results.
 */
export async function submitCodeAction(
  assessmentQuestionId: string,
  code: string,
): Promise<SubmitCodeResult> {
  const user = await requireUser();
  return submitCodingQuestion(user.id, assessmentQuestionId, code);
}

/**
 * Answers the CURRENT adaptive question. The client sends only
 * {assessmentQuestionId, optionId}; correctness, difficulty/skill state and
 * the next question are computed server-side and never returned (the
 * response carries the next question's safe projection only). Duplicate
 * submissions are idempotent — the assessment advances exactly once.
 */
export async function answerAdaptiveAction(
  assessmentQuestionId: string,
  optionId: string,
): Promise<{ ok: boolean; data?: AdaptiveTakingData; error?: string }> {
  const user = await requireUser();
  const result = await answerAdaptiveQuestion(user.id, assessmentQuestionId, optionId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}
