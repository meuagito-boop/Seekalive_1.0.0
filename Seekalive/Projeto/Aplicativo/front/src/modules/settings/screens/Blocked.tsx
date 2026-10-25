import { motion } from "framer-motion";
import { Ban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocial } from "@/context/SocialContext";
import { SettingsSubheader } from "./SettingsSubheader";
import { useToast } from "@/hooks/use-toast";

export default function SettingsBlocked() {
  const {
    users,
    unblockUser,
    socialGraphLoading,
    socialGraphError,
    retrySocialGraph,
  } = useSocial();
  const { toast } = useToast();
  const blocked = users.filter((u) => u.isBlockedByViewer);

  async function unblock(userId: string) {
    const remainsBlockedByOther = blocked.find(user => user.id === userId)?.blocksViewer;
    const success = await unblockUser(userId);
    if (!success) return;
    toast({
      title: "Seu bloqueio foi removido",
      description: remainsBlockedByOther
        ? "Este perfil também bloqueou você; os seguimentos removidos não serão restaurados."
        : "Os seguimentos removidos não serão restaurados automaticamente.",
    });
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Usuários bloqueados" />

      {socialGraphError && (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          {socialGraphError}{" "}
          <button type="button" className="font-semibold underline" onClick={retrySocialGraph}>Tentar novamente</button>
        </p>
      )}

      {socialGraphLoading && blocked.length === 0 ? (
        <p role="status" className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando bloqueios…</p>
      ) : blocked.length === 0 ? (
        <div className="flex flex-col items-center py-20 px-6 text-center text-muted-foreground">
          <Ban className="w-12 h-12 mb-4 opacity-30" aria-hidden />
          <p className="font-medium text-foreground">Nenhum usuário bloqueado</p>
          <p className="text-sm mt-1">Usuários que você bloquear aparecerão aqui.</p>
        </div>
      ) : (
        <div>
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {blocked.length} usuário{blocked.length !== 1 ? "s" : ""} bloqueado{blocked.length !== 1 ? "s" : ""}
          </p>
          {blocked.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border"
              data-testid={`blocked-${user.id}`}
            >
              <Avatar className="w-11 h-11 shrink-0 opacity-60">
                <AvatarImage src={user.avatarUrl} alt="" />
                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-muted-foreground truncate">{user.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
              <button
                type="button"
                onClick={() => unblock(user.id)}
                data-testid={`button-unblock-${user.id}`}
                className="shrink-0 px-4 py-1.5 rounded-full border border-border text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                Desbloquear
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
