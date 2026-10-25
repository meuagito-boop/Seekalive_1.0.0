import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, Menu, Users, Plus, ShoppingBag, FileText, Image, Video } from "lucide-react";
import { SocialDrawer } from "@/modules/social/components/SocialDrawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function BottomNav() {
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  const itemClass = "relative flex items-center justify-center w-full h-full transition-colors";
  const tone = (active: boolean) => (active ? "text-primary" : "text-muted-foreground hover:text-foreground");
  const searchActive = location.startsWith("/seek");
  const socialActive = location.startsWith("/feed");
  const shopActive = location.startsWith("/shop");

  return (
    <>
      <nav aria-label="Navegação principal" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-lg border-t border-border flex items-center justify-around z-40">
        <button ref={menuRef} type="button" aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)} className={`${itemClass} ${tone(drawerOpen)}`}>
          <Menu className="w-6 h-6" strokeWidth={2} />
        </button>
        <Link href="/feed" aria-label="Social" aria-current={socialActive ? "page" : undefined} className={`${itemClass} ${tone(socialActive)}`}>
          <Users className="w-6 h-6" strokeWidth={socialActive ? 2.5 : 2} />
        </Link>
        <button type="button" aria-label="Criar" aria-haspopup="dialog" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen(true)} className={`${itemClass} ${tone(addMenuOpen)}`}>
          <Plus className="w-6 h-6" strokeWidth={2} />
        </button>
        <Link href="/seek" aria-label="Seek" aria-current={searchActive ? "page" : undefined} className={`${itemClass} ${tone(searchActive)}`}>
          <MapPin className="w-6 h-6" strokeWidth={searchActive ? 2.5 : 2} />
        </Link>
        <Link href="/shop" aria-label="Abrir Shop" aria-current={shopActive ? "page" : undefined} className={`${itemClass} ${tone(shopActive)}`}>
          <ShoppingBag className="w-6 h-6" strokeWidth={shopActive ? 2.5 : 2} />
        </Link>
      </nav>

      <SocialDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} returnFocus={() => menuRef.current?.focus()} />
      <Dialog open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <DialogContent className="top-auto bottom-20 translate-y-0 w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Criar</DialogTitle>
            <DialogDescription className="sr-only">Escolha o conteúdo que deseja publicar.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            {[
              { label: "Criar publicação", icon: FileText, path: "/compose" },
              { label: "Enviar foto", icon: Image, path: "/compose?media=image" },
              { label: "Enviar vídeo", icon: Video, path: "/compose?media=video" },
            ].map(({ label, icon: Icon, path }) => (
              <button key={path} type="button" className="flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                onClick={() => { setAddMenuOpen(false); navigate(path); }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
