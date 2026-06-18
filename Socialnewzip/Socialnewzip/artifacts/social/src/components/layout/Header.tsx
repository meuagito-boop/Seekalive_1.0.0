import { Bell, Mail, ShoppingCart, Settings } from "lucide-react";
import { Link } from "wouter";

export function Header({ title, backTo }: { title?: string; backTo?: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border h-14 flex items-center justify-between px-4 md:hidden">
      {/* Logo + App Name */}
      <Link href="/feed" className="flex items-center gap-2 no-underline">
        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-xs leading-none">S</span>
        </div>
        <span className="font-bold text-base tracking-tight text-foreground">SeekAlive</span>
      </Link>

      {/* Right icons */}
      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Bell className="w-5 h-5" />
        </Link>
        <Link
          href="/messages"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Mail className="w-5 h-5" />
        </Link>
        <Link
          href="/feed"
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
