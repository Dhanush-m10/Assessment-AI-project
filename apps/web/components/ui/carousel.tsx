"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/**
 * Paged horizontal carousel matching the reference: N cards per page
 * (responsive), dash-style page dots and edge chevrons. No free scrolling —
 * pages keep card sizes identical and avoid clipped cards.
 *
 * Client state is page index + viewport only; all content is server-rendered
 * children, so first paint shows page 1 with zero client data fetching.
 */
function perViewFor(width: number): number {
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 640) return 2;
  return 1;
}

export function Carousel({ children }: { children: ReactNode[] }) {
  const [perView, setPerView] = useState(5);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const update = () => setPerView(perViewFor(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pages = useMemo(() => {
    const out: ReactNode[][] = [];
    for (let i = 0; i < children.length; i += perView) {
      out.push(children.slice(i, i + perView));
    }
    return out.length ? out : [[]];
  }, [children, perView]);

  const safePage = Math.min(page, pages.length - 1);

  return (
    <div className="relative">
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}
      >
        {pages[safePage]}
      </div>

      {pages.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="absolute -left-3 top-20 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-md transition hover:bg-white disabled:opacity-0"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={safePage === pages.length - 1}
            className="absolute -right-3 top-20 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-md transition hover:bg-white disabled:opacity-0"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-end gap-1.5" role="tablist" aria-label="Carousel pages">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                aria-current={i === safePage}
                onClick={() => setPage(i)}
                className={`h-1 rounded-full transition-all ${
                  i === safePage ? "w-5 bg-slate-800" : "w-3 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
