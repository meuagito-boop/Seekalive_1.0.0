import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UnavailableState } from "@/components/content/StateBlocks";
import type { ConnectionListKind } from "@/modules/social/types/connectionList";
import type { User } from "@/modules/profile/types/user";

type ConnectionListViewProps = {
  kind: ConnectionListKind;
  owner: User;
  currentUserId?: string;
  available: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  filteredUsers: User[];
  loading: boolean;
  remoteAccountCount: number;
  error: string | null;
  onRetry: () => void;
  nextCursor: string | null;
  onLoadMore: () => void;
  onToggleFollow: (userId: string) => void;
};

export function ConnectionListView({
  kind,
  owner,
  currentUserId,
  available,
  query,
  onQueryChange,
  filteredUsers,
  loading,
  remoteAccountCount,
  error,
  onRetry,
  nextCursor,
  onLoadMore,
  onToggleFollow,
}: ConnectionListViewProps) {
  if (!available) {
    return (
      <UnavailableState
        title="Conexões indisponíveis"
        description="Esta lista ainda não está disponível."
        action={
          <Link
            href={`/profile/${owner.username}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Voltar ao perfil
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar em quem você segue"
            aria-label="Buscar em quem você segue"
            data-testid="input-search"
            className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          {error}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={onRetry}
          >
            Tentar novamente
          </button>
        </p>
      )}

      {loading && remoteAccountCount === 0 && (
        <p
          role="status"
          className="px-4 py-8 text-center text-sm text-muted-foreground"
        >
          Carregando conexões…
        </p>
      )}

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center text-muted-foreground">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">
            {loading
              ? "Carregando conexões…"
              : query.trim()
                ? "Nenhuma conta encontrada para essa busca."
                : kind === "followers"
                  ? "Esta conta ainda não tem seguidores."
                  : "Você ainda não segue nenhuma conta."}
          </p>
        </div>
      ) : (
        <div>
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              data-testid={`user-card-${user.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <Link
                href={`/profile/${user.username}`}
                aria-label={`Ver perfil de ${user.displayName}`}
                className="flex min-w-0 flex-1 items-center gap-3 no-underline"
              >
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={user.avatarUrl} alt="" />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-foreground">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.bio}
                    </p>
                  )}
                </div>
              </Link>
              {user.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => onToggleFollow(user.id)}
                  data-testid={`button-follow-${user.id}`}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    user.isFollowing || user.followRequestSent
                      ? "bg-muted text-muted-foreground border border-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {user.isFollowing
                    ? "Seguindo"
                    : user.followRequestSent
                      ? "Cancelar"
                      : user.isPrivate
                        ? "Solicitar"
                        : "Seguir"}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center px-4 py-5">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}
