"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight } from "@/components/ui/icons";

type Skill = { id: string; name: string };

/**
 * Skill checkboxes for BASIC_SKILLS_MCQ. Pure UI over server-provided,
 * job-title-scoped skills — no ids are invented client-side, and the
 * server re-validates the selection at creation time.
 */
export function SkillsForm({ skills, action }: { skills: Skill[]; action: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <form
      className="mt-6 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const url = selected.length ? `${action}&skills=${encodeURIComponent(selected.join(","))}` : action;
        router.push(url);
      }}
    >
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

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Continue
          <IconArrowRight className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
        </button>
        <span className="text-xs text-slate-500">
          {selected.length} selected · skipping uses the job title&apos;s skills
        </span>
      </div>
    </form>
  );
}
