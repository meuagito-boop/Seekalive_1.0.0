import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  onSeeAll?: () => void;
  children: ReactNode;
}

export function DiscoveryCarousel({ id, title, subtitle, count, onSeeAll, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, count]);

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") { e.preventDefault(); scroll(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); scroll(-1); }
  }

  const navBtn = "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <section aria-labelledby={`${id}-title`} className="py-3">
      <div className="mb-2 flex items-end gap-2 px-3 md:px-0">
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="text-base font-extrabold tracking-tight text-foreground">
            {title} <span className="ml-1 text-xs font-semibold text-muted-foreground">{count}</span>
          </h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="hidden gap-1.5 md:flex">
          <button type="button" className={navBtn} onClick={() => scroll(-1)} disabled={edges.start} aria-label={`Anteriores em ${title}`} aria-controls={id}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={navBtn} onClick={() => scroll(1)} disabled={edges.end} aria-label={`Próximos em ${title}`} aria-controls={id}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll}
            className="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Ver todos
          </button>
        )}
      </div>
      <div className="relative">
        <div
          id={id}
          ref={ref}
          onScroll={update}
          onKeyDown={onKey}
          tabIndex={0}
          role="region"
          aria-label={`${title}: use as setas para rolar`}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-3 px-3 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:scroll-px-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
        {!edges.end && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
        )}
      </div>
    </section>
  );
}

export function DiscoveryCarouselItem({ children }: { children: ReactNode }) {
  return <div className="w-[72%] max-w-[260px] shrink-0 snap-start sm:w-[44%] lg:w-[30%]">{children}</div>;
}
