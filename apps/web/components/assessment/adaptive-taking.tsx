"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerAdaptiveAction, submitAssessmentAction } from "@/lib/assessment/actions";
import type { AdaptiveTakingData } from "@/lib/assessment/adaptive";
import { Card, ProgressBar } from "@/components/ui/card";
import { IconCheckCircle } from "@/components/ui/icons";

/**
 * Adaptive-taking island (Phase 8). One question at a time: the server
 * chooses what is shown, the browser sends only the selected option id, and
 * the response is the NEXT question's safe projection — correctness,
 * difficulty state and skill state never reach the client, and the
 * experience stays natural (no algorithm reveal, Part R). Refresh/resume is
 * server-reconstructed; this component holds no authoritative state.
 */
export function AdaptiveTakingScreen({ data }: { data: AdaptiveTakingData }) {
  const router = useRouter();
  const [state, setState] = useState<AdaptiveTakingData>(data);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (optionId: string) => {
    if (pending || !state.question) return;
    setSelected(optionId);
    setError(null);
    startTransition(async () => {
      const res = await answerAdaptiveAction(state.question!.id, optionId);
      if (!res.ok || !res.data) {
        setError(res.error ?? "Your answer could not be saved. Please try again.");
        setSelected(null);
        return;
      }
      setState(res.data);
      setSelected(null);
    });
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitAssessmentAction(state.assessmentId);
      if (res.redirect) {
        router.push(res.redirect);
        return;
      }
      if (res.error === "unanswered") {
        setError(`Please answer every served question before finishing (${res.missing} remaining).`);
        return;
      }
      setError(res.error ?? "Submission failed. Please try again.");
    });
  };

  const question = state.question;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-600">{state.categoryName}</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              {state.areaName}
              {state.jobTitleName ? ` · ${state.jobTitleName}` : ""}
            </h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-slate-900">
              Question {Math.min(state.served, state.count)} of {state.count}
            </p>
            <p className="text-slate-500">
              <span className="mr-2 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                Adaptive
              </span>
              {state.answered} answered
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar pct={(state.answered / state.count) * 100} label="Answered questions" />
        </div>
      </Card>

      {question ? (
        <Card className="p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Question {question.sequence}
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">{question.text}</h2>
          <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer options">
            {question.options.map((o) => {
              const isSelected = selected === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={pending}
                  onClick={() => choose(o.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-progress disabled:opacity-70 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                    }`}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  {o.text}
                </button>
              );
            })}
          </div>
          {pending && (
            <p className="mt-4 text-sm text-slate-400" role="status">
              Preparing your next question…
            </p>
          )}
        </Card>
      ) : state.complete ? (
        <Card className="p-8 text-center">
          <IconCheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">All questions answered</h2>
          <p className="mt-1 text-sm text-slate-500">
            You answered {state.answered} of {state.count} questions. Submit to score this
            assessment and see your results.
          </p>
          <button
            type="button"
            onClick={finish}
            disabled={pending}
            className="mt-5 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit assessment"}
          </button>
        </Card>
      ) : state.exhausted ? (
        <Card className="p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900">Question pool exhausted</h2>
          <p className="mt-2 text-sm text-slate-500">
            The library has no more eligible questions for this configuration, so the
            assessment stopped at {state.served} of {state.count} questions. You can finish
            now — your score is based on the questions you were served. AI-generated
            gap-fill arrives in the AI phase.
          </p>
          <button
            type="button"
            onClick={finish}
            disabled={pending}
            className="mt-5 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Finish and see results"}
          </button>
        </Card>
      ) : null}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-slate-400">
        Your next question is chosen on the server as you go · progress survives refresh and
        sign-out
      </p>
    </div>
  );
}
