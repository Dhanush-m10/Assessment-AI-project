"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIFFICULTIES_META,
  GENERAL_COUNT_MAX,
  GENERAL_COUNT_MIN,
} from "@/lib/assessment/limits";
import { EXPERIENCE_META } from "@/components/assessment/experience-meta";
import { buildSetupHref, type SetupFormTarget } from "./setup-target";

/**
 * Shared setup form (GENERAL + BASIC_MCQ): difficulty cards, optional
 * experience band (Basic MCQ only), question count 1–50 and the Preview
 * ON/OFF toggle. Navigates with query params; every value is re-validated
 * server-side on the next screen and again at creation.
 *
 * `target` is plain serializable data (RSC rule: no functions may cross the
 * server/client boundary) — see components/assessment/setup-target.ts.
 */
export function SetupForm({
  target,
  showExperience,
  maxCount = GENERAL_COUNT_MAX,
  countNoun = "questions",
  showAdaptive = false,
}: {
  target: SetupFormTarget;
  showExperience: boolean;
  /** D-LIMITS: 1-50 for MCQ flows, 1-10 for CODING. */
  maxCount?: number;
  countNoun?: string;
  /** Phase 8: show the Standard/Adaptive mode choice (BASIC_MCQ and
   *  BASIC_SKILLS_MCQ only — never GENERAL, never CODING in V1). */
  showAdaptive?: boolean;
}) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState("EASY");
  const [experience, setExperience] = useState("Y0_2");
  const [count, setCount] = useState(Math.min(10, maxCount));
  const [preview, setPreview] = useState(false);
  const [adaptive, setAdaptive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Idempotency key: generated ONCE per form instance (same pattern as
  // StartForm/JdForm) and shared with the creation step for GENERAL, so a
  // double "Continue" click replays the same assessment instead of creating
  // a second one (unique clientRequestId index).
  const [requestId, setRequestId] = useState("");
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setRequestId(crypto.randomUUID());
  }, []);

  const go = () => {
    if (navigating || !requestId) return;
    if (!Number.isInteger(count) || count < GENERAL_COUNT_MIN || count > maxCount) {
      setError(`${countNoun === "questions" ? "Question" : "Challenge"} count must be between ${GENERAL_COUNT_MIN} and ${maxCount}.`);
      return;
    }
    setError(null);
    setNavigating(true);
    // URL is assembled from the serializable target (RSC-safe); adaptive
    // starts are handled inside buildSetupHref (preview forced off).
    router.push(
      buildSetupHref(target, {
        difficulty,
        experience,
        count,
        preview,
        adaptive,
        clientRequestId: target.kind === "preview" ? requestId : undefined,
      }),
    );
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">Difficulty</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {DIFFICULTIES_META.map((d) => (
            <label
              key={d.value}
              className={`cursor-pointer rounded-xl border px-4 py-3 text-center transition-colors ${
                difficulty === d.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="difficulty"
                value={d.value}
                checked={difficulty === d.value}
                onChange={() => setDifficulty(d.value)}
                className="sr-only"
              />
              <span className="block text-sm font-bold">{d.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{d.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {showExperience && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Experience level</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {EXPERIENCE_META.map((e) => (
              <label
                key={e.value}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-center transition-colors ${
                  experience === e.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="experience"
                  value={e.value}
                  checked={experience === e.value}
                  onChange={() => setExperience(e.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-bold">{e.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="count" className="text-sm font-semibold text-slate-800">
          Number of {countNoun}
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="count"
            type="number"
            min={GENERAL_COUNT_MIN}
            max={maxCount}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <span className="text-sm text-slate-500">
            between {GENERAL_COUNT_MIN} and {maxCount}
          </span>
        </div>
      </div>

      {showAdaptive && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Assessment mode</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Assessment mode">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                !adaptive
                  ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/30"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="assessmentMode"
                checked={!adaptive}
                onChange={() => setAdaptive(false)}
                className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600/40"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">Standard</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  A fixed set of questions generated up front. Default.
                </span>
              </span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                adaptive
                  ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/30"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="assessmentMode"
                checked={adaptive}
                onChange={() => {
                  setAdaptive(true);
                  setPreview(false);
                }}
                className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600/40"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">Adaptive</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Adaptive mode adjusts question difficulty and skill focus based on your
                  responses to better understand your current skill level.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      )}

      <label
        className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 ${
          adaptive ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <span>
          <span className="block text-sm font-bold text-slate-800">Preview questions</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {adaptive
              ? "Not available in Adaptive mode — questions are chosen as you go."
              : "Review the selected questions and swap any of them before starting."}
          </span>
        </span>
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={preview}
            disabled={adaptive}
            onChange={(e) => setPreview(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600/40"
          />
          <span
            aria-hidden
            className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
          />
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={go}
        disabled={navigating || !requestId}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {navigating ? "Continuing…" : "Continue"}
      </button>
    </div>
  );
}
