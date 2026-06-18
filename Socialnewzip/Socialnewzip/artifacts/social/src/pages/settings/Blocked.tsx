import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Ban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockUsers } from "@/data/mockData";

export default function SettingsBlocked() {
  const [, setLocation] = useLocation();
  const [blocked, setBlocked] = useState(mockUsers.slice(4, 6));

  function unblock(id: string) {
    setBlocked(prev => prev.filter(u => u.id !== id));
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center gap-3 px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Usuários bloqueados</h1>
      </div>

      {blocked.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Ban className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-medium">Nenhum usuário bloqueado</p>
          <p className="text-sm mt-1 opacity-70">Usuários que você bloquear aparecerão aqui.</p>
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
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border"
              data-testid={`blocked-${user.id}`}
            >
              <Avatar className="w-11 h-11 shrink-0 opacity-60">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>{user.displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-muted-foreground">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <button
                onClick={() => unblock(user.id)}
                data-testid={`button-unblock-${user.id}`}
                className="shrink-0 px-4 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
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
