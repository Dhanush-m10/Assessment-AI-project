"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconSearch } from "@/components/ui/icons";
import { PreviewModal } from "@/components/ui/preview-modal";
import { FlowBadge, SkillChip } from "@/components/ui/badges";
import { VISUALS, type VisualKey } from "@/lib/ui/category-visuals";

/**
 * Interactive assessment card (Part D): subtle elevation, banner scale,
 * overlay + metadata reveal and CTA emphasis on hover/focus — while every
 * essential fact (name, meta, flow) also stays visible at rest.
 * Quick view opens a modal with database-sourced details only.
 */
export type AssessmentCardData = {
  id: string;
  name: string;
  meta: string;
  href: string;
  visual: VisualKey;
  flowLabel: string;
  details: { label: string; value: string }[];
  skills?: string[];
  implemented: boolean;
};

export function AssessmentCard({ data }: { data: AssessmentCardData }) {
  const [open, setOpen] = useState(false);
  const visual = VISUALS[data.visual];

  const body = (
    <>
      <div
        aria-hidden
        className={`relative flex h-36 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br sm:h-40 ${visual.gradient}`}
      >
        <span className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/15 transition-transform duration-300 motion-safe:group-hover:scale-110" />
        <span className="absolute -bottom-12 -left-4 h-28 w-28 rounded-full bg-white/10 transition-transform duration-300 motion-safe:group-hover:scale-105" />
        <span className="absolute inset-0 bg-slate-900/0 transition-colors duration-300 motion-safe:group-hover:bg-slate-900/10" />
        <CardMotif visual={data.visual} />
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="font-bold text-slate-900">{data.name}</p>
          <p className="mt-1 text-sm text-slate-500">{data.meta}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <FlowBadge flow={data.flowLabel} />
          <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
            <span className="opacity-0 transition-opacity duration-200 motion-safe:group-hover:opacity-100">
              Explore
            </span>
            <IconArrowRight className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </>
  );

  const cardClass =
    "flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:shadow-lg motion-safe:group-focus-within:-translate-y-1 motion-safe:group-focus-within:shadow-lg";

  return (
    <>
      <div className="group relative h-full">
        {data.implemented ? (
          <Link href={data.href} className={cardClass}>
            {body}
          </Link>
        ) : (
          <div className={`${cardClass} opacity-80`} aria-disabled="true">
            {body}
          </div>
        )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Quick view: ${data.name}`}
        className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-slate-700 opacity-0 shadow transition-opacity duration-200 focus-visible:opacity-100 motion-safe:group-hover:opacity-100"
      >
        <IconSearch className="h-4 w-4" />
      </button>
      </div>

      <PreviewModal open={open} onClose={() => setOpen(false)} title={data.name}>
        <dl className="space-y-2 text-sm">
          {data.details.map((d) => (
            <div key={d.label} className="flex justify-between gap-4">
              <dt className="text-slate-500">{d.label}</dt>
              <dd className="font-semibold text-slate-900">{d.value}</dd>
            </div>
          ))}
        </dl>
        {data.skills && data.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Skills</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.skills.slice(0, 8).map((s) => (
                <SkillChip key={s}>{s}</SkillChip>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Close
          </button>
          {data.implemented && (
            <Link
              href={data.href}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Continue
            </Link>
          )}
        </div>
      </PreviewModal>
    </>
  );
}

/** Consistent illustration motifs per visual key (inline SVG, no assets). */
function CardMotif({ visual }: { visual: VisualKey }) {
  const cls =
    "relative h-14 w-14 text-white transition-transform duration-300 motion-safe:group-hover:scale-[1.06]";
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (visual) {
    case "ai":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <circle cx="10" cy="12" r="4" /><circle cx="10" cy="36" r="4" />
          <circle cx="24" cy="24" r="5" /><circle cx="38" cy="12" r="4" /><circle cx="38" cy="36" r="4" />
          <path d="M13.5 14 20 21M13.5 34 20 27M28 21l6.5-7M28 27l6.5 7" />
        </svg>
      );
    case "web":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <rect x="6" y="10" width="36" height="28" rx="3" />
          <path d="M6 18h36M12 14h.01M17 14h.01" />
          <path d="m18 26-4 4 4 4M30 26l4 4-4 4" />
        </svg>
      );
    case "data":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <path d="M8 40V24M18 40V14M28 40v-12M38 40V20" />
          <circle cx="18" cy="10" r="2.5" /><circle cx="38" cy="16" r="2.5" />
        </svg>
      );
    case "security":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <path d="M24 42s14-6 14-17V12L24 6 10 12v13c0 11 14 17 14 17z" />
          <path d="m18 23 4 4 8-8" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <path d="M14 34a8 8 0 0 1 1-15.9A11 11 0 0 1 36.6 21 7.5 7.5 0 0 1 35 34z" />
          <path d="M20 40h8M24 36v8" />
        </svg>
      );
    case "code":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <rect x="6" y="8" width="36" height="32" rx="3" />
          <path d="m16 20-6 6 6 6M32 20l6 6-6 6M26 16l-4 16" />
        </svg>
      );
    case "business":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <path d="m8 34 10-10 7 7 15-15" />
          <path d="M30 16h10v10" />
        </svg>
      );
    case "design":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <circle cx="24" cy="24" r="16" />
          <circle cx="18" cy="18" r="3" /><circle cx="30" cy="18" r="3" /><circle cx="24" cy="30" r="3" />
        </svg>
      );
    case "health":
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <path d="M24 42S8 32 8 20a9 9 0 0 1 16-5.6A9 9 0 0 1 40 20c0 12-16 22-16 22z" />
          <path d="M16 24h5l3-6 3 10 2-4h4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" className={cls} aria-hidden {...stroke}>
          <circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="8" />
          <circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
