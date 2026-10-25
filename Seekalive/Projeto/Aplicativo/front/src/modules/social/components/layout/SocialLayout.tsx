import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Header } from "@/modules/app/layouts/Header";
import { BottomNav } from "@/modules/app/layouts/BottomNav";
import { SocialDesktopHeader } from "@/modules/app/layouts/SocialDesktopHeader";
import { SocialSidebar } from "@/modules/social/components/SocialSidebar";
import { SocialContextPanel } from "@/modules/social/components/SocialContextPanel";

interface SocialLayoutProps {
  children: React.ReactNode;
}

export function SocialLayout({ children }: SocialLayoutProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    setLocation(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">

      {/* ── Mobile header (existing, md:hidden) ────────────────── */}
      <Header />

      {/* ── Desktop header (hidden on mobile) ──────────────────── */}
      <SocialDesktopHeader />

      {/* ── Desktop: central search bar ────────────────────────── */}
      <div className="hidden md:block sticky top-14 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-2">
          <form role="search" onSubmit={submitSearch} className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar no Social"
              placeholder="Buscar publicações, pessoas e vídeos"
              className="w-full h-10 pl-9 pr-4 bg-muted/60 border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </form>
        </div>
      </div>

      {/* ── Desktop: 3-column layout ────────────────────────────── */}
      <div className="hidden md:flex max-w-6xl mx-auto px-4 pt-4 gap-4 items-start">

        {/* Left sidebar */}
        <aside className="w-56 flex-shrink-0 sticky top-[104px] self-start max-h-[calc(100vh-108px)] overflow-y-auto">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <SocialSidebar />
          </div>
        </aside>

        {/* Center: main content */}
        <main className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden min-h-[calc(100vh-120px)]">
          {children}
        </main>

        {/* Right: contextual panel */}
        <aside className="w-72 flex-shrink-0 sticky top-[104px] self-start max-h-[calc(100vh-108px)] overflow-y-auto">
          <SocialContextPanel />
        </aside>

      </div>

      {/* ── Mobile layout ───────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Mobile search row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
          <form role="search" onSubmit={submitSearch} className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar no Social"
              placeholder="Buscar publicações, pessoas e vídeos"
              className="w-full h-9 pl-9 pr-4 bg-muted/60 border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </form>
        </div>

        {/* Feed content */}
        <div className="pb-16">
          {children}
        </div>
      </div>

      {/* ── Bottom nav (mobile only, fixed) ─────────────────────── */}
      <BottomNav />
    </div>
  );
}
