import { motion } from "framer-motion";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/modules/profile/types/user";

interface SearchPeopleResultsProps {
  users: User[];
  isRemoteSocialSession: boolean;
  normalizedQueryLength: number;
  isLoading: boolean;
  error: string | null;
  nextCursor: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onToggleFollow: (userId: string) => void;
}

function FollowButton({ user, onToggleFollow }: { user: User; onToggleFollow: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`${user.isFollowing ? "Deixar de seguir" : user.followRequestSent ? "Cancelar solicitação para seguir" : user.isPrivate ? "Solicitar para seguir" : "Seguir"} ${user.displayName}`}
      onClick={() => onToggleFollow(user.id)}
      data-testid={`button-follow-result-${user.id}`}
      className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        user.isFollowing || user.followRequestSent
          ? "border border-border bg-muted text-muted-foreground"
          : "bg-primary text-primary-foreground"
      }`}
    >
      {user.isFollowing ? "Seguindo" : user.followRequestSent ? "Cancelar" : user.isPrivate ? "Solicitar" : "Seguir"}
    </button>
  );
}

export function SearchPeopleResults({
  users,
  isRemoteSocialSession,
  normalizedQueryLength,
  isLoading,
  error,
  nextCursor,
  onRetry,
  onLoadMore,
  onToggleFollow,
}: SearchPeopleResultsProps) {
  if (isRemoteSocialSession && error) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p role="alert" className="font-medium text-destructive">{error}</p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  if (isRemoteSocialSession && normalizedQueryLength < 2) {
    return <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Digite pelo menos 2 caracteres para buscar.</p></div>;
  }
  if (isLoading && users.length === 0) {
    return <div role="status" className="py-16 text-center text-muted-foreground"><p className="font-medium">Buscando pessoas…</p></div>;
  }
  if (users.length === 0) {
    return <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma pessoa encontrada</p></div>;
  }

  return (
    <>
      {users.map((user, index) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/20"
          data-testid={`result-user-${user.id}`}
        >
          <Link href={`/profile/${user.username}`} aria-label={`Ver perfil de ${user.displayName}`}>
            <Avatar className="h-11 w-11">
              <AvatarImage src={user.avatarUrl} alt="" />
              <AvatarFallback>{user.displayName[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.bio.slice(0, 70)}</p>
          </div>
          <FollowButton user={user} onToggleFollow={onToggleFollow} />
        </motion.div>
      ))}
      {isRemoteSocialSession && nextCursor && (
        <div className="flex justify-center px-4 py-5">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isLoading ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </>
  );
}
