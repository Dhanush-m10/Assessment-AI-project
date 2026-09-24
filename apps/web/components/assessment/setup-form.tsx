"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIFFICULTIES_META,
  GENERAL_COUNT_MAX,
  GENERAL_COUNT_MIN,
} from "@/lib/assessment/limits";

/**
 * General setup form: difficulty cards + question count (1–50). GETs to the
 * preview route; the server re-validates everything there and again at
 * creation, so client checks are UX-only.
 */
export function SetupForm({ areaId }: { areaId: string }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState("EASY");
  const [count, setCount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const goPreview = () => {
    if (!Number.isInteger(count) || count < GENERAL_COUNT_MIN || count > GENERAL_COUNT_MAX) {
      setError(`Question count must be between ${GENERAL_COUNT_MIN} and ${GENERAL_COUNT_MAX}.`);
      return;
    }
    setError(null);
    router.push(
      `/assessments/${areaId}/preview?difficulty=${difficulty}&count=${count}`,
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

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={goPreview}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2"
      >
        Preview assessment
      </button>
    </div>
  );
}
