"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIFFICULTIES_META,
  GENERAL_COUNT_MAX,
  GENERAL_COUNT_MIN,
} from "@/lib/assessment/limits";
import { EXPERIENCE_META } from "@/components/assessment/experience-meta";

/**
 * Shared setup form (GENERAL + BASIC_MCQ): difficulty cards, optional
 * experience band (Basic MCQ only), question count 1–50 and the Preview
 * ON/OFF toggle. Navigates with query params; every value is re-validated
 * server-side on the next screen and again at creation.
 */
export function SetupForm({
  hrefFor,
  showExperience,
}: {
  hrefFor: (p: {
    difficulty: string;
    experience: string;
    count: number;
    preview: boolean;
  }) => string;
  showExperience: boolean;
}) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState("EASY");
  const [experience, setExperience] = useState("Y0_2");
  const [count, setCount] = useState(10);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = () => {
    if (!Number.isInteger(count) || count < GENERAL_COUNT_MIN || count > GENERAL_COUNT_MAX) {
      setError(`Question count must be between ${GENERAL_COUNT_MIN} and ${GENERAL_COUNT_MAX}.`);
      return;
    }
    setError(null);
    router.push(hrefFor({ difficulty, experience, count, preview }));
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
          Number of questions
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="count"
            type="number"
            min={GENERAL_COUNT_MIN}
            max={GENERAL_COUNT_MAX}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <span className="text-sm text-slate-500">
            between {GENERAL_COUNT_MIN} and {GENERAL_COUNT_MAX}
          </span>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span>
          <span className="block text-sm font-bold text-slate-800">Preview questions</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Review the selected questions and swap any of them before starting.
          </span>
        </span>
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={preview}
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
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2"
      >
        Continue
      </button>
    </div>
  );
}
