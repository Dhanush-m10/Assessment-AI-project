"use client";

import { useEffect, useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startCodingAssessment } from "@/lib/assessment/actions";
import { IconArrowRight } from "@/components/ui/icons";

type Skill = { id: string; name: string };

/**
 * Skill step form, two modes:
 * - `action` (BASIC_SKILLS_MCQ): pure navigation to the JD step; the
 *   selection travels as a query parameter (re-validated server-side).
 * - `create` (CODING): finalizes the assessment WITHOUT a JD — submits to
 *   the startCodingAssessment server action (idempotent via clientRequestId)
 *   and redirects to preview or take.
 * Pure UI over server-provided, job-title-scoped skills — no ids are
 * invented client-side.
 */
export function SkillsForm({
  skills,
  action,
  create,
}: {
  skills: Skill[];
  action?: string;
  create?: {
    areaId: string;
    jobTitleId: string;
    difficulty: string;
    experience: string;
    count: number;
    preview: boolean;
  };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction] = useActionState(startCodingAssessment, {});
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState("");
  const actionRef = useRef(formAction);
  actionRef.current = formAction;

  useEffect(() => {
    setRequestId(crypto.randomUUID());
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const checkboxes = (
    <div className="space-y-2">
      {skills.map((skill) => {
        const checked = selected.includes(skill.id);
        return (
          <label
            key={skill.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
              checked
                ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(skill.id)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/40"
            />
            <span className="text-sm font-medium text-slate-900">{skill.name}</span>
          </label>
        );
      })}
    </div>
  );

  const footerNote = (
    <span className="text-xs text-slate-500">
      {selected.length} selected · skipping uses the job title&apos;s skills
    </span>
  );

  if (create) {
    return (
      <form
        className="mt-6 space-y-5"
        action={(fd) => {
          setPending(true);
          actionRef.current(fd);
        }}
      >
        <input type="hidden" name="areaId" value={create.areaId} />
        <input type="hidden" name="jobTitleId" value={create.jobTitleId} />
        <input type="hidden" name="difficulty" value={create.difficulty} />
        <input type="hidden" name="experience" value={create.experience} />
        <input type="hidden" name="count" value={String(create.count)} />
        <input type="hidden" name="preview" value={create.preview ? "on" : "off"} />
        <input type="hidden" name="clientRequestId" value={requestId} />
        {selected.length > 0 && (
          <input type="hidden" name="skillIds" value={selected.join(",")} />
        )}

        {checkboxes}

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
            {state.available !== undefined ? ` (eligible: ${state.available})` : ""}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending || !requestId}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Creating your assessment…"
              : create.preview
                ? "Create & preview assessment"
                : "Create & start assessment"}
            {!pending && <IconArrowRight className="h-4 w-4" />}
          </button>
          {footerNote}
        </div>
      </form>
    );
  }

  if (!action) return null; // create mode only

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const url = selected.length ? `${action}&skills=${encodeURIComponent(selected.join(","))}` : action;
        router.push(url);
      }}
    >
      {checkboxes}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Continue
          <IconArrowRight className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
        </button>
        {footerNote}
      </div>
    </form>
  );
}
