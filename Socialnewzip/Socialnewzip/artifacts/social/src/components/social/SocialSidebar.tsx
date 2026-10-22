import { Link, useLocation } from "wouter";
import {
  Users, Heart, Bookmark, MessageSquare, FileText, History,
  ChevronRight, UserPlus, Compass, ShoppingBag, Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppContext } from "@/context/AppContext";

interface SocialSidebarProps {
  onNavigate?: () => void;
}

function NavItem({
  icon: Icon,
  label,
  path,
  onNavigate,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === path || location.startsWith(path + "/");

  return (
    <Link
      href={path}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors no-underline ${
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  );
}

export function SocialSidebar({ onNavigate }: SocialSidebarProps) {
  const { currentUser } = useAppContext();

  return (
    <nav className="flex flex-col gap-0 py-3 px-2">

      {/* Profile card */}
      {currentUser && (
        <Link
          href={`/profile/${currentUser.username}`}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors mb-2 no-underline"
        >
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="bg-primary/15 text-primary font-bold">
              {currentUser.displayName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{currentUser.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">@{currentUser.username}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Link>
      )}

      {/* Explorar */}
      <SectionLabel>Explorar</SectionLabel>
      <NavItem icon={Users} label="Social" path="/feed" onNavigate={onNavigate} />
      <NavItem icon={Search} label="Buscar no Social" path="/search" onNavigate={onNavigate} />
      <NavItem icon={Compass} label="Seek" path="/seek" onNavigate={onNavigate} />
      <NavItem icon={ShoppingBag} label="Shop" path="/shop" onNavigate={onNavigate} />

      {/* Rede */}
      <SectionLabel>Rede</SectionLabel>
      <NavItem icon={Users} label="Amigos" path="/circles" onNavigate={onNavigate} />
      <NavItem icon={UserPlus} label="Seguir" path="/social/suggestions" onNavigate={onNavigate} />

      {/* Atividades */}
      <SectionLabel>Atividades</SectionLabel>
      <NavItem icon={History} label="Histórico" path="/social/activity" onNavigate={onNavigate} />
      <NavItem icon={Bookmark} label="Itens salvos" path="/social/activity" onNavigate={onNavigate} />
      <NavItem icon={Heart} label="Curtidas" path="/social/activity" onNavigate={onNavigate} />
      <NavItem icon={MessageSquare} label="Comentários" path="/social/activity" onNavigate={onNavigate} />
      <NavItem icon={FileText} label="Publicações" path="/social/activity" onNavigate={onNavigate} />

    </nav>
  );
}
