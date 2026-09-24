"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveAnswerAction,
  submitAssessmentAction,
} from "@/lib/assessment/actions";
import type { TakingData } from "@/lib/assessment/general";
import { Card, ProgressBar } from "@/components/ui/card";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/**
 * Assessment-taking island. Selections are persisted server-side on every
 * click (UserAnswer upsert), so refresh/logout never loses progress. The
 * browser only ever sends {questionId, optionId} and "submit" — correctness
 * and scoring live entirely on the server.
 */
export function TakingScreen({ data }: { data: TakingData }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>(data.answers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const total = data.questions.length;
  const question = data.questions[idx];
  const answeredCount = useMemo(
    () => data.questions.filter((q) => selections[q.id]).length,
    [data.questions, selections],
  );

  const select = (optionId: string) => {
    setSelections((s) => ({ ...s, [question.id]: optionId }));
    setSaveState("saving");
    startTransition(async () => {
      const res = await saveAnswerAction(question.id, optionId);
      setSaveState(res.ok ? "idle" : "error");
    });
  };

  const submit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const res = await submitAssessmentAction(data.assessmentId);
      if (res.redirect) {
        router.push(res.redirect);
        return;
      }
      if (res.error === "unanswered") {
        setSubmitError(
          `Please answer all questions before submitting (${res.missing} remaining).`,
        );
        return;
      }
      setSubmitError(res.error ?? "Submission failed. Please try again.");
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-600">{data.categoryName}</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              {data.areaName}
            </h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-slate-900">
              Question {idx + 1} of {total}
            </p>
            <p className="text-slate-500">
              {answeredCount} answered ·{" "}
              {saveState === "saving" ? (
                <span className="text-slate-400">saving…</span>
              ) : saveState === "error" ? (
                <span className="font-semibold text-red-600">
                  progress not saved — select again
                </span>
              ) : (
                <span className="text-emerald-600">progress saved</span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar pct={(answeredCount / total) * 100} label="Answered questions" />
        </div>
      </Card>

      <Card className="p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Question {question.sequence}
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{question.text}</h2>
        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer options">
          {question.options.map((o) => {
            const selected = selections[question.id] === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => select(o.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  selected
                    ? "border-blue-600 bg-blue-50 font-semibold text-blue-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  }`}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
      </Card>

      {submitError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconChevronLeft className="h-4 w-4" /> Previous
        </button>

        <div className="flex gap-1.5" aria-label="Question navigator">
          {data.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              aria-label={`Go to question ${i + 1}${selections[q.id] ? " (answered)" : ""}`}
              aria-current={i === idx}
              onClick={() => setIdx(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === idx
                  ? "bg-blue-600"
                  : selections[q.id]
                    ? "bg-blue-300 hover:bg-blue-400"
                    : "bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        {idx < total - 1 ? (
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Next <IconChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Submit assessment
          </button>
        )}
      </div>
    </div>
  );
}
