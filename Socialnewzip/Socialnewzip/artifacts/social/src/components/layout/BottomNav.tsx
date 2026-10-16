import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Users, Plus, ShoppingBag, FileText, Image, Video, X } from "lucide-react";

export function BottomNav() {
  const [location, navigate] = useLocation();
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const navItems = [
    { icon: Search,      path: "/seek",   key: "seek" },
    { icon: Users,       path: "/feed",   key: "social" },
    { icon: null,        path: null,      key: "add" },
    { icon: ShoppingBag, path: "/shop",   key: "shop" },
  ];

  const isActive = (path: string | null) => {
    if (!path) return false;
    return location.startsWith(path);
  };

  return (
    <>
      {addMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setAddMenuOpen(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 mx-4 mb-2 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="font-semibold text-sm text-foreground">Criar</span>
              <button
                onClick={() => setAddMenuOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col pb-2">
              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                onClick={() => { setAddMenuOpen(false); navigate("/compose"); }}
              >
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Criar postagem</span>
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                onClick={() => setAddMenuOpen(false)}
              >
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Image className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Enviar foto</span>
              </button>
              <button
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                onClick={() => setAddMenuOpen(false)}
              >
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Enviar vídeo</span>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-lg border-t border-border flex items-center justify-around z-50">
        {navItems.map((item) => {
          if (item.key === "add") {
            return (
              <button
                key="add"
                onClick={() => setAddMenuOpen((prev) => !prev)}
                className="relative flex items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-6 h-6" strokeWidth={2} />
              </button>
            );
          }

          const Icon = item.icon!;
          const active = isActive(item.path);

          return (
            <Link
              key={item.key}
              href={item.path!}
              className="relative flex items-center justify-center w-full h-full transition-colors"
              style={{ color: active ? "#f97316" : undefined }}
            >
              <Icon
                className={active ? "w-6 h-6" : "w-6 h-6 text-muted-foreground"}
                strokeWidth={active ? 2.5 : 2}
              />
            </Link>
          );
        })}
      </div>
    </>
  );
}
