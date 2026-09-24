"use client";

import { useEffect, useActionState, useRef, useState } from "react";
import { startBasicMcqAssessment } from "@/lib/assessment/actions";
import type { LibraryJd } from "@/lib/assessment/basic-mcq";
import { PASTED_JD_MAX_CHARS } from "@/lib/assessment/jd-limits";

/**
 * JD choice + creation form. Library JDs are radio-selected (ids validated
 * server-side against job title + band + LIVE), pasted JDs are snapshotted
 * without creating library rows, and AI generation is a clearly labelled
 * placeholder for the later AI phase (no keys, no fabricated text).
 */
export function JdForm({
  areaId,
  jobTitleId,
  difficulty,
  experience,
  count,
  preview,
  jds,
}: {
  areaId: string;
  jobTitleId: string;
  difficulty: string;
  experience: string;
  count: number;
  preview: boolean;
  jds: LibraryJd[];
}) {
  const [state, formAction] = useActionState(startBasicMcqAssessment, {});
  const [mode, setMode] = useState<"LIBRARY" | "USER_PASTED">(jds.length ? "LIBRARY" : "USER_PASTED");
  const [jdId, setJdId] = useState(jds[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState("");
  const actionRef = useRef(formAction);
  actionRef.current = formAction;

  useEffect(() => {
    setRequestId(crypto.randomUUID());
  }, []);

  return (
    <div className="space-y-6">
      <form
        className="space-y-6"
        action={(fd) => {
          setPending(true);
          actionRef.current(fd);
        }}
      >
        <input type="hidden" name="areaId" value={areaId} />
        <input type="hidden" name="jobTitleId" value={jobTitleId} />
        <input type="hidden" name="difficulty" value={difficulty} />
        <input type="hidden" name="experience" value={experience} />
        <input type="hidden" name="count" value={String(count)} />
        <input type="hidden" name="preview" value={preview ? "on" : "off"} />
        <input type="hidden" name="clientRequestId" value={requestId} />
        <input type="hidden" name="jdMode" value={mode} />
        <input type="hidden" name="jdId" value={mode === "LIBRARY" ? jdId : ""} />

        {jds.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">
              Existing job descriptions (library)
            </legend>
            <div className="mt-2 space-y-3">
              {jds.map((jd) => (
                <label
                  key={jd.id}
                  className={`block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                    mode === "LIBRARY" && jdId === jd.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="jdChoice"
                    checked={mode === "LIBRARY" && jdId === jd.id}
                    onChange={() => {
                      setMode("LIBRARY");
                      setJdId(jd.id);
                    }}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900">{jd.title}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Library
                    </span>
                  </span>
                  {jd.skills.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {jd.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                        >
                          {s}
                        </span>
                      ))}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Paste a job description</legend>
          <label
            className={`mt-2 block cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
              mode === "USER_PASTED" ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="radio"
              name="jdPasteChoice"
              checked={mode === "USER_PASTED"}
              onChange={() => setMode("USER_PASTED")}
              className="sr-only"
            />
            <span className="text-sm font-bold text-slate-900">Use my own JD text</span>
            <textarea
              name="jdContent"
              rows={6}
              maxLength={PASTED_JD_MAX_CHARS}
              placeholder="Paste the job description for this role…"
              onClick={(e) => {
                e.preventDefault();
                setMode("USER_PASTED");
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <span className="mt-1 block text-xs text-slate-400">
              Stored as a snapshot with this assessment only — never added to the JD library.
            </span>
          </label>
        </fieldset>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">Generate with AI</p>
          <p className="mt-1 text-xs text-slate-500">
            AI JD generation connects in the AI phase. Use a library JD or paste your own for
            now.
          </p>
          <button
            type="button"
            disabled
            className="mt-2 cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
          >
            Generate JD (coming in AI phase)
          </button>
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
            {state.available !== undefined ? ` (eligible: ${state.available})` : ""}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !requestId || (mode === "LIBRARY" && !jdId)}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating your assessment…" : preview ? "Create & preview assessment" : "Create & start assessment"}
        </button>
      </form>
    </div>
  );
}
