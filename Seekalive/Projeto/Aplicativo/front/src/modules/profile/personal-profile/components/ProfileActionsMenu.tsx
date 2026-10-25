import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { useToast } from "@/modules/shared/hooks/useToast";
import type { User } from "@/modules/profile/types/user";

interface ProfileActionsMenuProps {
  user: User;
  onBlockToggle: () => Promise<boolean>;
}

export function ProfileActionsMenu({ user, onBlockToggle }: ProfileActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  async function toggleBlockAndClose() {
    if (await onBlockToggle()) setIsOpen(false);
  }

  function copyProfileLink() {
    setIsOpen(false);
    const url = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/profile/${user.username}`;
    navigator.clipboard?.writeText(url).then(
      () => toast({ title: "Link do perfil copiado" }),
      () => toast({ title: "Não foi possível copiar o link", variant: "destructive" }),
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Mais opções do perfil"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="button-more"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed px-4 py-3 text-left text-sm text-muted-foreground"
              data-testid="action-silenciar"
            >
              Silenciar<span className="block text-[11px]">Indisponível nesta versão</span>
            </button>
            <button
              type="button"
              onClick={() => void toggleBlockAndClose()}
              className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50"
              data-testid="action-bloquear"
            >
              {user.isBlockedByViewer ? "Desbloquear" : "Bloquear"}
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed px-4 py-3 text-left text-sm text-muted-foreground"
              data-testid="action-denunciar"
            >
              Denunciar<span className="block text-[11px]">Indisponível nesta versão</span>
            </button>
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted/50"
              onClick={copyProfileLink}
              data-testid="action-compartilhar-perfil"
            >
              Copiar link do perfil
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
