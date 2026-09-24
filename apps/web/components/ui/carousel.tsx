"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

/**
 * Paged horizontal carousel (Part F): responsive cards-per-page, animated
 * track translate, edge chevrons, dash dots, pointer swipe and keyboard
 * arrows. Movement is a single transform (GPU-friendly, no layout thrash)
 * and disabled under prefers-reduced-motion. Content stays server-rendered
 * children — the island only paginates.
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
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);

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
  const go = (next: number) => setPage(Math.max(0, Math.min(pages.length - 1, next)));

  const onPointerUp = () => {
    if (!drag) return;
    if (drag.dx < -48) go(safePage + 1);
    else if (drag.dx > 48) go(safePage - 1);
    setDrag(null);
  };

  return (
    <div className="relative">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Assessment areas"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(safePage + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(safePage - 1);
          }
        }}
        className="overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
        onPointerDown={(e) => setDrag({ startX: e.clientX, dx: 0 })}
        onPointerMove={(e) => drag && setDrag({ startX: drag.startX, dx: e.clientX - drag.startX })}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="flex motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
          style={{
            transform: `translateX(calc(-${safePage * 100}% + ${drag ? drag.dx : 0}px))`,
          }}
        >
          {pages.map((pageItems, i) => (
            <div
              key={i}
              aria-hidden={i !== safePage}
              className="grid w-full shrink-0 gap-5 px-0.5"
              style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}
            >
              {pageItems}
            </div>
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => go(safePage - 1)}
            disabled={safePage === 0}
            className="absolute -left-3 top-20 rounded-full bg-white/95 p-1.5 text-slate-700 shadow-md transition hover:bg-white disabled:opacity-0"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => go(safePage + 1)}
            disabled={safePage === pages.length - 1}
            className="absolute -right-3 top-20 rounded-full bg-white/95 p-1.5 text-slate-700 shadow-md transition hover:bg-white disabled:opacity-0"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-4 flex justify-end gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                aria-current={i === safePage}
                onClick={() => go(i)}
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
