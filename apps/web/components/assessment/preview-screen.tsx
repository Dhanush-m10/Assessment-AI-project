"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  replaceQuestionAction,
  startFromPreviewAction,
} from "@/lib/assessment/actions";
import type { PreviewData } from "@/lib/assessment/engine";
import { Card } from "@/components/ui/card";

/**
 * Preview island: renders the generated questions exactly as the taking
 * screen will (display-safe projection — no correct answers, explanations or
 * scoring metadata), offers per-question Replace (shared engine) and the
 * Start Test transition (PREVIEW -> IN_PROGRESS).
 */
export function PreviewScreen({ data }: { data: PreviewData }) {
  const router = useRouter();
  const [pendingReplace, setPendingReplace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();

  const replace = (questionId: string) => {
    setError(null);
    setPendingReplace(questionId);
    startTransition(async () => {
      const res = await replaceQuestionAction(questionId);
      setPendingReplace(null);
      if (!res.ok) {
        setError(res.error ?? "Replacement failed.");
        return;
      }
      router.refresh();
    });
  };

  const start = () => {
    setError(null);
    startTransition(async () => {
      const res = await startFromPreviewAction(data.assessmentId);
      if (res.ok && res.redirect) {
        router.push(res.redirect);
        return;
      }
      setError("This assessment can no longer be started from preview.");
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <p className="text-sm font-semibold text-blue-600">
          {data.categoryName}
          {data.jobTitleName ? ` · ${data.jobTitleName}` : ""}
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
          Preview: {data.areaName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {data.questions.length} questions ·{" "}
          {data.difficulty.charAt(0) + data.difficulty.slice(1).toLowerCase()}
          {data.experienceBand ? ` · ${data.experienceBand.replace("Y", "").replace("_", "–")} years` : ""}
          . Review the set; replace anything unfamiliar before starting.
        </p>
      </Card>

      {data.questions.map((q) => (
        <Card key={q.id} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Question {q.sequence}
            </p>
            <button
              type="button"
              onClick={() => replace(q.id)}
              disabled={pendingReplace !== null || starting}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingReplace === q.id ? "Replacing…" : "Replace Question"}
            </button>
          </div>
          {q.kind === "MCQ" ? (
            <>
              <h2 className="mt-2 text-lg font-bold text-slate-900">{q.text}</h2>
              <ul className="mt-4 space-y-2">
                {q.options.map((o, i) => (
                  <li
                    key={o.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
                  >
                    <span className="mr-2 font-semibold text-slate-400">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {o.text}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{q.title}</h2>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {q.language}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
                {q.problemStatement}
              </p>
              {q.constraints && (
                <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  {q.constraints}
                </p>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {q.publicTests.length} sample test{q.publicTests.length === 1 ? "" : "s"} ·
                hidden tests run only at submission
              </p>
              <div className="mt-2 space-y-2">
                {q.publicTests.map((t, i) => (
                  <div key={t.id} className="grid grid-cols-2 gap-2 text-xs">
                    <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                      <span className="mb-1 block font-semibold text-slate-400">Input {i + 1}</span>
                      {t.input}
                    </pre>
                    <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                      <span className="mb-1 block font-semibold text-slate-400">
                        Expected output {i + 1}
                      </span>
                      {t.expectedOutput}
                    </pre>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      ))}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={start}
        disabled={starting || pendingReplace !== null}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {starting ? "Starting…" : "Start Test"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Starting locks the question set and begins the assessment.
      </p>
    </div>
  );
}
