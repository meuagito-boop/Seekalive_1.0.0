import { Link, useLocation } from "wouter";
import { Home, Search, Bell, Mail, Users, Settings, User, ShoppingBag } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useSocial } from "@/context/SocialContext";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { currentUser } = useAppContext();
  const { unreadNotifications, unreadMessages } = useSocial();

  const navItems = [
    { icon: Home, path: "/feed", label: "Social" },
    { icon: Search, path: "/search", label: "Seek", badge: 0 },
    { icon: Bell, path: "/notifications", label: "Notificações", badge: unreadNotifications },
    { icon: Mail, path: "/messages", label: "Mensagens", badge: unreadMessages },
    { icon: ShoppingBag, path: "/feed", label: "Shop", badge: 0 },
    { icon: Users, path: "/circles", label: "Círculos", badge: 0 },
    { icon: Settings, path: "/settings", label: "Configurações", badge: 0 },
    {
      icon: User,
      path: currentUser ? `/profile/${currentUser.username}` : "/profile",
      label: "Perfil",
      badge: 0,
    },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-background p-4">
      <Link
        href="/feed"
        className="mb-8 px-3 flex items-center gap-2.5 hover:opacity-80 transition-opacity no-underline"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_hsl(24_95%_53%_/_0.35)]">
          <span className="text-white font-black text-sm leading-none">S</span>
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">SeekAlive</span>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.path);
          const badge = (item as { badge?: number }).badge;

          return (
            <Link
              key={item.label}
              href={item.path}
              className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? "text-primary font-semibold bg-primary/8"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </div>
              <span className="text-sm">{item.label}</span>
              {badge && badge > 0 ? (
                <span className="ml-auto text-xs font-bold text-primary">{badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <Link href="/compose">
          <Button variant="brand" className="w-full h-11">
            Publicar
          </Button>
        </Link>
      </div>
    </div>
  );
}
