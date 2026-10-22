import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, Plus, ShoppingBag } from "lucide-react";
import { SocialDrawer } from "@/components/social/SocialDrawer";

export function BottomNav() {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  const itemClass = "relative flex items-center justify-center w-full h-full transition-colors";
  const tone = (active: boolean) => (active ? "text-primary" : "text-muted-foreground hover:text-foreground");
  // Em rotas do Seek a lupa busca no Seek; nas demais, na busca do Social.
  const inSeek = location.startsWith("/seek");
  const searchHref = inSeek ? "/seek" : "/search";
  const searchActive = inSeek ? location === "/seek" : location.startsWith("/search");
  const shopActive = location.startsWith("/shop");

  return (
    <>
      <nav aria-label="Navegação principal" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-lg border-t border-border flex items-center justify-around z-40">
        <Link href={searchHref} aria-label={inSeek ? "Buscar no Seek" : "Buscar no Social"} aria-current={searchActive ? "page" : undefined} className={`${itemClass} ${tone(searchActive)}`}>
          <Search className="w-6 h-6" strokeWidth={searchActive ? 2.5 : 2} />
        </Link>
        <button ref={menuRef} type="button" aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)} className={`${itemClass} ${tone(drawerOpen)}`}>
          <Menu className="w-6 h-6" strokeWidth={2} />
        </button>
        <Link href="/compose" aria-label="Criar publicação" className={`${itemClass} ${tone(false)}`}>
          <Plus className="w-6 h-6" strokeWidth={2} />
        </Link>
        <Link href="/shop" aria-label="Abrir Shop" aria-current={shopActive ? "page" : undefined} className={`${itemClass} ${tone(shopActive)}`}>
          <ShoppingBag className="w-6 h-6" strokeWidth={shopActive ? 2.5 : 2} />
        </Link>
      </nav>

      <SocialDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} returnFocus={() => menuRef.current?.focus()} />
    </>
  );
}
