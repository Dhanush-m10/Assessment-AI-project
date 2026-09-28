"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  runCodeAction,
  submitCodeAction,
  submitAssessmentAction,
} from "@/lib/assessment/actions";
import type { CodingTakingData, TestRunView } from "@/lib/assessment/coding";
import { languageLabel } from "@/lib/judge0/languages";
import { Card, ProgressBar } from "@/components/ui/card";
import { DifficultyBadge, SkillChip } from "@/components/ui/badges";
import { CodeEditor } from "@/components/assessment/code-editor";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/**
 * Coding-taking island. The browser sends only code; language choice, test
 * data, execution, comparison, pass/fail and scoring all live server-side
 * (lib/assessment/coding.ts + lib/judge0). Hidden tests are never rendered:
 * only PUBLIC samples appear in the question card, and run/submit results are
 * safe summaries (status labels + the candidate's own stdout/stderr).
 */
type SavedState = {
  code: string;
  passed: number | null;
  total: number | null;
  correct: boolean | null;
};

export function CodingTakingScreen({ data }: { data: CodingTakingData }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [states, setStates] = useState<Record<string, SavedState>>(() =>
    Object.fromEntries(
      data.questions.map((q) => [
        q.id,
        {
          code: q.saved.code ?? q.starterCode,
          passed: q.saved.passedTestCount,
          total: q.saved.totalTestCount,
          correct: q.saved.isCorrect,
        },
      ]),
    ),
  );
  const [runResults, setRunResults] = useState<Record<string, TestRunView[]>>({});
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const total = data.questions.length;
  const question = data.questions[idx];
  const state = states[question.id];
  const submittedCount = useMemo(
    () => data.questions.filter((q) => states[q.id]?.passed !== null).length,
    [data.questions, states],
  );

  const setCode = (code: string) =>
    setStates((s) => ({ ...s, [question.id]: { ...s[question.id], code } }));

  const run = () => {
    setActionError(null);
    // Clear this question's results immediately: while the new run is in
    // flight the panel shows the loading state, so a previous execution is
    // never displayed as the current one (stale-output guard).
    setRunResults((r) => ({ ...r, [question.id]: [] }));
    setBusy("run");
    startTransition(async () => {
      const res = await runCodeAction(question.id, state.code);
      setBusy(null);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setRunResults((r) => ({ ...r, [question.id]: res.results }));
    });
  };

  const submitQuestion = () => {
    setActionError(null);
    setBusy("submit");
    startTransition(async () => {
      const res = await submitCodeAction(question.id, state.code);
      setBusy(null);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      setStates((s) => ({
        ...s,
        [question.id]: { code: state.code, passed: res.passed, total: res.total, correct: res.correct },
      }));
      setRunResults((r) => ({ ...r, [question.id]: [] }));
    });
  };

  const submitAssessment = () => {
    setSubmitError(null);
    startTransition(async () => {
      const res = await submitAssessmentAction(data.assessmentId);
      if (res.redirect) {
        router.push(res.redirect);
        return;
      }
      if (res.error === "unanswered") {
        setSubmitError(
          `Submit code for every challenge before finishing (${res.missing} remaining).`,
        );
        return;
      }
      setSubmitError(res.error ?? "Submission failed. Please try again.");
    });
  };

  const runs = runResults[question.id];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-600">{data.categoryName}</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              {data.areaName}
              {data.jobTitleName ? ` · ${data.jobTitleName}` : ""}
            </h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-slate-900">
              Challenge {idx + 1} of {total}
            </p>
            <p className="text-slate-500">
              {submittedCount} submitted ·{" "}
              <span className="text-emerald-600">progress saved on submit</span>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar pct={(submittedCount / total) * 100} label="Submitted challenges" />
        </div>
      </Card>

      <Card className="p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Challenge {question.sequence}
          </p>
          <DifficultyBadge difficulty={data.difficulty} />
          <SkillChip emphasized>{languageLabel(question.language)}</SkillChip>
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{question.title}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {question.problemStatement}
        </p>
        {question.constraints && (
          <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            {question.constraints}
          </p>
        )}

        {question.publicTests.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sample tests
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {question.publicTests.map((t, i) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                >
                  <p className="font-bold text-slate-700">Example {i + 1}</p>
                  <p className="mt-1.5 text-slate-400">Input</p>
                  <pre className="mt-0.5 overflow-x-auto rounded-md bg-slate-50 px-2 py-1.5 text-slate-700">
                    {t.input}
                  </pre>
                  <p className="mt-1.5 text-slate-400">Expected output</p>
                  <pre className="mt-0.5 overflow-x-auto rounded-md bg-slate-50 px-2 py-1.5 text-slate-700">
                    {t.expectedOutput}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Your code — {languageLabel(question.language)}
          </span>
          {state.passed !== null && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                state.correct
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-rose-200"
              }`}
            >
              {state.correct ? "Passed" : "Failed"} · {state.passed}/{state.total} tests
            </span>
          )}
        </div>
        <div className="mt-3 h-[340px] resize-y overflow-hidden rounded-xl border border-slate-300 bg-slate-950 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30">
          <CodeEditor
            value={state.code}
            onChange={setCode}
            language={question.language}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "run" ? "Running…" : "Run Code"}
          </button>
          <button
            type="button"
            onClick={submitQuestion}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "submit" ? "Executing tests…" : "Submit Code"}
          </button>
          <span className="text-xs text-slate-500">
            Run checks the sample tests · Submit executes all tests and saves your attempt
          </span>
        </div>

        {actionError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {(busy === "run" || (runs && runs.length > 0)) && (
          <div
            className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Output
              </span>
            </div>
            <div className="space-y-4 px-4 py-3">
              {busy === "run" ? (
                <p className="font-mono text-sm text-slate-400">
                  Running your code against the sample tests…
                </p>
              ) : (
                runs!.map((r) => (
                  <div key={r.index}>
                    <p
                      className={`font-mono text-sm font-bold ${
                        r.passed ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {r.passed ? "✓" : "✕"} Test {r.index} — {r.statusLabel}
                    </p>
                    {r.stdout !== null && r.stdout.trim() !== "" ? (
                      <>
                        <p className="mt-1.5 text-xs text-slate-500">Output</p>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-slate-900 px-3 py-2 font-mono text-xs leading-relaxed text-slate-200">
                          {r.stdout}
                        </pre>
                      </>
                    ) : (
                      <p className="mt-1.5 text-xs italic text-slate-500">No output</p>
                    )}
                    {r.stderr && (
                      <>
                        <p className="mt-2 text-xs font-semibold text-rose-400">stderr</p>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-rose-950/40 px-3 py-2 font-mono text-xs leading-relaxed text-rose-200">
                          {r.stderr}
                        </pre>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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

        <div className="flex gap-1.5" aria-label="Challenge navigator">
          {data.questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              aria-label={`Go to challenge ${i + 1}${states[q.id]?.passed !== null ? " (submitted)" : ""}`}
              aria-current={i === idx}
              onClick={() => setIdx(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === idx
                  ? "bg-blue-600"
                  : states[q.id]?.passed !== null
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
            onClick={submitAssessment}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Submit assessment
          </button>
        )}
      </div>
    </div>
  );
}
