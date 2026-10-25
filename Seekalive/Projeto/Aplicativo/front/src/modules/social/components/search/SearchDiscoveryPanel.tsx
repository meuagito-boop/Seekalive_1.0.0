import { motion } from "framer-motion";
import { Hash, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCount } from "@/modules/shared/utils/formatters";
import type { User } from "@/modules/profile/types/user";
import type { TrendingTopic } from "@/modules/social/data/demoTrendingTopics";

interface SearchDiscoveryPanelProps {
  trendingTopics: TrendingTopic[];
  suggestedUsers: User[];
  isRemoteSocialSession: boolean;
  onSearch: (value: string) => void;
  onToggleFollow: (userId: string) => void;
}

export function SearchDiscoveryPanel({
  trendingTopics,
  suggestedUsers,
  isRemoteSocialSession,
  onSearch,
  onToggleFollow,
}: SearchDiscoveryPanelProps) {
  return (
    <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-4 pb-3 pt-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Em alta</h2>
        </div>
        {trendingTopics.length > 0 ? (
          <div className="space-y-1">
            {trendingTopics.map((topic, index) => (
              <motion.button
                key={topic.tag}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSearch(topic.tag)}
                data-testid={`trending-${topic.tag}`}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{topic.category} · Em alta</p>
                  <p className="text-base font-bold">{topic.tag}</p>
                  <p className="text-xs text-muted-foreground">{formatCount(topic.count)} publicações</p>
                </div>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            As tendências aparecerão quando houver publicações reais.
          </p>
        )}
      </div>

      <div className="px-4 pb-3 pt-2">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Pessoas para seguir</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {suggestedUsers.length > 0 ? suggestedUsers.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3"
              data-testid={`suggest-${user.id}`}
            >
              <Link href={`/profile/${user.username}`} aria-label={`Ver perfil de ${user.displayName}`}>
                <Avatar className="h-14 w-14">
                  <AvatarImage src={user.avatarUrl} alt="" />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="text-center">
                <p className="w-full truncate text-xs font-semibold">{user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <button
                type="button"
                aria-label={`${user.isFollowing ? "Deixar de seguir" : user.followRequestSent ? "Cancelar solicitação para seguir" : user.isPrivate ? "Solicitar para seguir" : "Seguir"} ${user.displayName}`}
                onClick={() => onToggleFollow(user.id)}
                data-testid={`button-follow-${user.id}`}
                className={`w-full rounded-full py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  user.isFollowing || user.followRequestSent
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {user.isFollowing ? "Seguindo" : user.followRequestSent ? "Cancelar" : user.isPrivate ? "Solicitar" : "Seguir"}
              </button>
            </motion.div>
          )) : (
            <p className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {isRemoteSocialSession
                ? "Busque por nome ou @ para encontrar contas verificadas."
                : "Novas pessoas aparecerão quando houver contas disponíveis."}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
