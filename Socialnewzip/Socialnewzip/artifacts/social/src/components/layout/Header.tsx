import { Bell, Mail, ShoppingCart, Settings } from "lucide-react";
import { Link } from "wouter";

// Props aceitas por compatibilidade; páginas dentro do AppShell não devem renderizar Header de novo.
export function Header(_props: { title?: string; backTo?: string } = {}) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border h-14 flex items-center justify-between px-4 md:hidden">
      {/* Logo + App Name */}
      <Link href="/feed" className="flex items-center gap-2 no-underline">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-black text-xs leading-none">S</span>
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">SeekAlive</span>
      </Link>

      {/* Right icons */}
      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          aria-label="Notificações"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="w-5 h-5" />
        </Link>
        <Link
          href="/messages"
          aria-label="Mensagens"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Mail className="w-5 h-5" />
        </Link>
        <Link
          href="/shop"
          aria-label="Shop"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
        </Link>
        <Link
          href="/settings"
          aria-label="Configurações"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
