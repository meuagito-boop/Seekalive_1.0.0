import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Users, Search, UserCheck, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import { accountViewToUser, socialGraphApi } from "@/modules/social/services/socialGraphApi";
import { UnavailableState } from "@/components/content/StateBlocks";

export default function Circles() {
  const params = useParams<{ username?: string }>();
  const [query, setQuery] = useState("");
  const { currentUser } = useAppContext();
  const {
    users,
    toggleFollow,
    isRemoteSocialSession,
    upsertRemoteUser,
  } = useSocial();
  const [remoteCircle, setRemoteCircle] = useState<ReturnType<typeof accountViewToUser>[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const isAnotherProfile = Boolean(params.username && params.username !== currentUser?.username);

  useEffect(() => {
    if (!isRemoteSocialSession || isAnotherProfile) return;
    let active = true;
    setRemoteCircle([]);
    setNextCursor(null);
    setError(null);
    setLoading(true);
    void socialGraphApi.getCircle()
      .then((page) => {
        if (!active) return;
        const accounts = page.items.map((entry) => accountViewToUser(entry.account));
        accounts.forEach(upsertRemoteUser);
        setRemoteCircle(accounts);
        setNextCursor(page.nextCursor);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o Círculo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, isAnotherProfile, retry, upsertRemoteUser]);

  const acceptedList = isRemoteSocialSession
    ? remoteCircle
    : users.filter(user => user.id !== currentUser?.id && !user.isBlocked && user.isInCircle);
  const acceptedCount = isRemoteSocialSession
    ? currentUser?.stats.circles ?? acceptedList.length
    : acceptedList.length;

  if (isAnotherProfile) {
    return (
      <UnavailableState
        title="Círculo indisponível"
        description="O Círculo é uma lista privada da sua própria conta."
      />
    );
  }

  async function removeFromCircle(id: string) {
    if (await toggleFollow(id) && isRemoteSocialSession) {
      setRemoteCircle((accounts) => accounts.filter((account) => account.id !== id));
    }
  }

  async function loadMore() {
    if (!isRemoteSocialSession || !nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await socialGraphApi.getCircle(nextCursor);
      const accounts = page.items.map((entry) => accountViewToUser(entry.account));
      accounts.forEach(upsertRemoteUser);
      setRemoteCircle((existing) => [
        ...existing,
        ...accounts.filter((account) => !existing.some((item) => item.id === account.id)),
      ]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar mais contas.");
    } finally {
      setLoading(false);
    }
  }

  const filteredAccepted = acceptedList.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Page header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => window.history.back()}
          className="text-muted-foreground hover:text-foreground shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <h1 className="font-bold text-base leading-tight">Meu Círculo</h1>
          <p className="text-xs text-muted-foreground">
            {acceptedCount} {acceptedCount === 1 ? "pessoa" : "pessoas"} que se seguem mutuamente
          </p>
        </div>
      </div>

      {/* Pessoas que se seguem mutuamente */}
          {/* Search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar no seu Círculo"
                aria-label="Buscar no seu Círculo"
                className="w-full h-9 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="px-4 py-3 text-sm text-destructive">
              {error}{" "}
              <button type="button" className="font-semibold underline" onClick={() => setRetry((value) => value + 1)}>
                Tentar novamente
              </button>
            </p>
          )}
          {loading && acceptedList.length === 0 ? (
            <p role="status" className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando Círculo…</p>
          ) : filteredAccepted.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-30" />
              <p className="font-medium">
                {query ? "Ninguém do Círculo encontrado" : "Seu Círculo está vazio"}
              </p>
              <p className="text-sm mt-1 opacity-70">
                {query ? `Sem resultado para "${query}"` : "O Círculo é formado automaticamente quando você e outra pessoa se seguem."}
              </p>
            </div>
          ) : (
            <div>
              {filteredAccepted.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  data-testid={`circle-${user.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
                >
                  <Avatar className="w-11 h-11 shrink-0">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio.slice(0, 60)}</p>
                  </div>
                  <button
                    onClick={() => void removeFromCircle(user.id)}
                    data-testid={`button-remove-circle-${user.id}`}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                  >
                    Deixar de seguir
                  </button>
                </motion.div>
              ))}
            </div>
          )}
          {isRemoteSocialSession && nextCursor && (
            <div className="flex justify-center px-4 py-5">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? "Carregando…" : "Carregar mais"}
              </button>
            </div>
          )}
    </div>
  );
}
