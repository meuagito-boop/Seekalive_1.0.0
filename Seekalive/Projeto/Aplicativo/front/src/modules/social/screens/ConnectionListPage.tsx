import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { UnavailableState } from "@/components/content/StateBlocks";
import { ConnectionListView } from "@/modules/social/components/connections/ConnectionListView";
import { useConnectionList } from "@/modules/social/hooks/useConnectionList";
import type { ConnectionListKind } from "@/modules/social/types/connectionList";

export function ConnectionListPage({ kind }: { kind: ConnectionListKind }) {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const {
    currentUser,
    owner,
    isRemoteSocialSession,
    available,
    query,
    setQuery,
    filteredUsers,
    remoteAccountCount,
    nextCursor,
    loading,
    error,
    retry,
    loadMore,
    toggleFollow,
  } = useConnectionList(kind, params.username);

  if (!owner) {
    return (
      <UnavailableState
        title={
          isRemoteSocialSession && !error
            ? "Carregando perfil"
            : "Perfil indisponível"
        }
        description={
          error ??
          (isRemoteSocialSession
            ? "Buscando os dados atualizados da conta."
            : `Não encontramos @${params.username}. A conta pode ter sido removida.`)
        }
        action={
          error ? (
            <button
              type="button"
              className="text-sm font-semibold text-primary hover:underline"
              onClick={retry}
            >
              Tentar novamente
            </button>
          ) : (
            <Link
              href="/feed"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Voltar ao feed
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() =>
            window.history.length > 1
              ? window.history.back()
              : setLocation(`/profile/${owner.username}`)
          }
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-bold text-base">{owner.displayName}</h1>
          <p className="text-xs text-muted-foreground">
            {kind === "followers" ? "Seguidores" : "Seguindo"}
          </p>
        </div>
      </div>

      <ConnectionListView
        kind={kind}
        owner={owner}
        currentUserId={currentUser?.id}
        available={available}
        query={query}
        onQueryChange={setQuery}
        filteredUsers={filteredUsers}
        loading={loading}
        remoteAccountCount={remoteAccountCount}
        error={error}
        onRetry={retry}
        nextCursor={nextCursor}
        onLoadMore={() => void loadMore()}
        onToggleFollow={(userId) => void toggleFollow(userId)}
      />
    </div>
  );
}
