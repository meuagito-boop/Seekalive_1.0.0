import { useState } from "react";
import { Briefcase, Calendar, Coffee, Heart, LayoutGrid, ShoppingBag, Smile, Tag, Utensils, Wine, Wrench } from "lucide-react";
import type { ElementType } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ICONS: Record<string, ElementType> = {
  restaurantes: Utensils, bares: Wine, cafes: Coffee, eventos: Calendar, servicos: Briefcase,
  compras: ShoppingBag, saude: Heart, lazer: Smile, reparos: Wrench,
};

export interface DiscoveryCategory { key: string; label: string; count: number }

interface Props {
  categories: DiscoveryCategory[];
  active: string;
  onSelect: (key: string) => void;
}

function Chip({ c, active, onSelect }: { c: DiscoveryCategory; active: boolean; onSelect: () => void }) {
  const Icon = ICONS[c.key] ?? Tag;
  return (
    <button type="button" onClick={onSelect} aria-pressed={active}
      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}>
      <Icon className="h-4 w-4" aria-hidden />
      {c.label}
      <span className={`text-xs ${active ? "opacity-80" : "opacity-60"}`}>{c.count}</span>
    </button>
  );
}

export function DiscoveryCategories({ categories, active, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  if (!categories.length) return null;
  const visible = categories.slice(0, 8);
  return (
    <nav aria-label="Categorias" className="py-2">
      <div className="flex gap-2 overflow-x-auto px-3 pb-1 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-dashed border-primary/50 px-4 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <LayoutGrid className="h-4 w-4" aria-hidden /> Todas
        </button>
        {visible.map((c) => (
          <Chip key={c.key} c={c} active={active === c.key} onSelect={() => onSelect(active === c.key ? "" : c.key)} />
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Todas as categorias</DialogTitle>
            <DialogDescription>Categorias presentes nos perfis e eventos disponíveis agora.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!active} onClick={() => { onSelect(""); setOpen(false); }}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${!active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              Qualquer categoria
            </button>
            {categories.map((c) => (
              <Chip key={c.key} c={c} active={active === c.key} onSelect={() => { onSelect(c.key); setOpen(false); }} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
