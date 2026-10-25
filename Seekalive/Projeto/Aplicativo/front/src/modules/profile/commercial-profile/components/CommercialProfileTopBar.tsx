import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MoreHorizontal, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/modules/profile/types/user";

interface CommercialProfileTopBarProps {
  user: User;
  isMe: boolean;
  onShare: () => void;
  onBlock: () => void;
  onToggleFollow: () => void;
}

export function CommercialProfileTopBar({
  user,
  isMe,
  onShare,
  onBlock,
  onToggleFollow,
}: CommercialProfileTopBarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-lg">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => (window.history.length > 1
            ? window.history.back()
            : window.location.assign(`${import.meta.env.BASE_URL}feed`))}
          aria-label="Voltar"
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user.displayName}</p>
          <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onShare}
          aria-label="Compartilhar perfil"
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 aria-hidden="true" className="h-4 w-4" />
        </button>
        {!isMe && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((value) => !value)}
              aria-label="Mais opções do perfil comercial"
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="button-more-commercial-profile"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>
            {showProfileMenu && (
              <div
                role="menu"
                className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onBlock();
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="action-block-commercial-profile"
                >
                  Bloquear perfil
                </button>
              </div>
            )}
          </div>
        )}
        {isMe ? (
          <Button asChild variant="outline" className="h-8 rounded-full px-3 text-xs">
            <Link href="/profile/edit">Editar perfil</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant={user.isFollowing || user.followRequestSent ? "outline" : "default"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={onToggleFollow}
          >
            {user.isFollowing
              ? "Seguindo"
              : user.followRequestSent
                ? "Cancelar solicitação"
                : user.isPrivate
                  ? "Solicitar para seguir"
                  : "Seguir"}
          </Button>
        )}
      </div>
    </header>
  );
}
