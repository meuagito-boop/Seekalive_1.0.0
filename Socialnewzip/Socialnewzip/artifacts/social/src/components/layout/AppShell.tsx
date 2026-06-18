import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Header } from "./Header";
import { SocialDesktopHeader } from "./SocialDesktopHeader";
import { BottomNav } from "./BottomNav";

const searchConfig: Record<string, string> = {
  seek:   "Buscar comércios e eventos...",
  shop:   "Buscar produtos, serviços, ofertas e lojas...",
};

function getModule(location: string): string | null {
  if (location.startsWith("/seek"))   return "seek";
  if (location.startsWith("/feed"))   return "social";
  if (location.startsWith("/roleta")) return "roleta";
  if (location.startsWith("/shop"))   return "shop";
  return null;
}

interface AppShellProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function AppShell({ children, fullWidth }: AppShellProps) {
  const [location] = useLocation();
  const module = getModule(location);
  const searchPlaceholder = module ? searchConfig[module] : null;
  const showSearch = !!searchPlaceholder;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile header */}
      <Header />

      {/* Desktop header */}
      <SocialDesktopHeader />

      {/* Desktop contextual search */}
      {showSearch && (
        <div className="hidden md:block sticky top-14 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-2">
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder!}
                className="w-full h-10 pl-9 pr-4 bg-muted/60 border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile contextual search */}
      {showSearch && (
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder!}
              className="w-full h-9 pl-9 pr-4 bg-muted/60 border border-border rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={fullWidth ? "pb-16 md:pb-0" : "pb-16 md:pb-0 max-w-2xl mx-auto w-full"}>
        {children}
      </div>

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
