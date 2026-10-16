import { Link, useLocation } from "wouter";
import { Bell, Mail, ShoppingCart, Settings } from "lucide-react";
import { useSocial } from "@/context/SocialContext";

const moduleNav = [
  { label: "Seek",    path: "/seek" },
  { label: "Social",  path: "/feed" },
  { label: "Shop",    path: "/shop" },
];

function getActiveModule(location: string): string | null {
  if (location.startsWith("/seek"))    return "Seek";
  if (location.startsWith("/feed"))    return "Social";
  if (location.startsWith("/shop"))    return "Shop";
  return null;
}

export function SocialDesktopHeader() {
  const [location] = useLocation();
  const { unreadNotifications, unreadMessages } = useSocial();
  const activeModule = getActiveModule(location);

  return (
    <header className="hidden md:flex sticky top-0 z-40 h-14 bg-background/95 backdrop-blur-lg border-b border-border items-center px-6">
      {/* Logo + name */}
      <Link href="/feed" className="flex items-center gap-2 no-underline flex-shrink-0 mr-8">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_0_10px_hsl(24_95%_53%_/_0.3)]">
          <span className="text-white font-black text-xs leading-none">S</span>
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">SeekAlive</span>
      </Link>

      {/* Center module nav */}
      <nav className="flex-1 flex items-center justify-center gap-1">
        {moduleNav.map((item) => {
          const isActive = activeModule === item.label;
          return (
            <Link
              key={item.label}
              href={item.path}
              className={`relative px-5 h-14 flex items-center justify-center text-sm font-semibold transition-colors no-underline ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right icons */}
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-8">
        <Link
          href="/notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Link>
        <Link
          href="/messages"
          className="relative w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Mail className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Link>
        <Link
          href="/shop"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
        </Link>
        <Link
          href="/settings"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
