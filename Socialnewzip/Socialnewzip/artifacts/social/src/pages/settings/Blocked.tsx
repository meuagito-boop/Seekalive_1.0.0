import { motion } from "framer-motion";
import { Ban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocial } from "@/context/SocialContext";
import { SettingsSubheader, UnavailableNotice } from "./SettingsSubheader";

export default function SettingsBlocked() {
  const { users } = useSocial();
  const blocked = users.filter((u) => u.isBlocked);

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Usuários bloqueados" />

      {blocked.length === 0 ? (
        <div className="flex flex-col items-center py-20 px-6 text-center text-muted-foreground">
          <Ban className="w-12 h-12 mb-4 opacity-30" aria-hidden />
          <p className="font-medium text-foreground">Nenhum usuário bloqueado</p>
          <p className="text-sm mt-1">Usuários que você bloquear aparecerão aqui.</p>
        </div>
      ) : (
        <div>
          <UnavailableNotice>Desbloquear por esta tela ainda não está disponível.</UnavailableNotice>
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
                disabled
                data-testid={`button-unblock-${user.id}`}
                className="shrink-0 px-4 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground opacity-60 cursor-not-allowed"
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
