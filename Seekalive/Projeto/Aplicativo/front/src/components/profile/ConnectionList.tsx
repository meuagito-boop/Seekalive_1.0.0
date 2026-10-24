import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { UnavailableState } from "@/components/content/StateBlocks";
import { accountListToUsers, socialGraphApi } from "@/services/socialGraphApi";

export function ConnectionList({ kind }: { kind: "followers" | "following" }) {
  const params = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const {
    users,
    toggleFollow,
    isRemoteSocialSession,
    loadRemoteProfile,
    upsertRemoteUser,
  } = useSocial();
  const { currentUser } = useAppContext();
  const label = kind === "followers" ? "Seguidores" : "Seguindo";
  const [remoteAccounts, setRemoteAccounts] = useState<ReturnType<typeof accountListToUsers>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const isMe = !!currentUser && params.username === currentUser.username;
  const owner = isMe
    ? currentUser
    : isRemoteSocialSession
      ? users.find((user) => user.username === params.username && user.source === "server")
      : users.find((user) => user.username === params.username);

  useEffect(() => {
    if (!isRemoteSocialSession || isMe || owner || !params.username) return;
    let active = true;
    void loadRemoteProfile(params.username)
      .then((loaded) => {
        if (active && !loaded) setError("O nome de usuário informado não é válido.");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o perfil.");
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, isMe, owner?.id, params.username, retry, loadRemoteProfile]);

  useEffect(() => {
    if (!isRemoteSocialSession || !owner) return;
    let active = true;
    setRemoteAccounts([]);
    setNextCursor(null);
    setError(null);
    setLoading(true);
    const fetchPage = kind === "followers" ? socialGraphApi.getFollowers : socialGraphApi.getFollowing;
    void fetchPage(owner.id)
      .then((page) => {
        if (!active) return;
        const pageUsers = accountListToUsers(page.items);
        pageUsers.forEach(upsertRemoteUser);
        setRemoteAccounts(pageUsers);
        setNextCursor(page.nextCursor);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a lista.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, owner?.id, kind, retry, upsertRemoteUser]);

  if (!owner) {
    return (
      <UnavailableState
        title={isRemoteSocialSession && !error ? "Carregando perfil" : "Perfil indisponível"}
        description={error ?? (isRemoteSocialSession
          ? "Buscando os dados atualizados da conta."
          : `Não encontramos @${params.username}. A conta pode ter sido removida.`)}
        action={error
          ? <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button>
          : <Link href="/feed" className="text-sm font-semibold text-primary hover:underline">Voltar ao feed</Link>}
      />
    );
  }

  const available = isRemoteSocialSession || (kind === "following" && isMe);
  const base = isRemoteSocialSession
    ? remoteAccounts.filter((user) => user.id !== owner.id && !user.isBlocked)
    : available ? users.filter((user) => user.id !== owner.id && !user.isBlocked && user.isFollowing) : [];
  const q = query.trim().toLowerCase();
  const filtered = base.filter(u => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));

  async function loadMore() {
    if (!isRemoteSocialSession || !owner || !nextCursor || loading) return;
    setLoading(true);
    setError(null);
    const fetchPage = kind === "followers" ? socialGraphApi.getFollowers : socialGraphApi.getFollowing;
    try {
      const page = await fetchPage(owner.id, nextCursor);
      const pageUsers = accountListToUsers(page.items);
      pageUsers.forEach(upsertRemoteUser);
      setRemoteAccounts((existing) => [
        ...existing,
        ...pageUsers.filter((user) => !existing.some((item) => item.id === user.id)),
      ]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar mais contas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border flex items-center gap-3 px-4 h-14">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => (window.history.length > 1 ? window.history.back() : setLocation(`/profile/${owner.username}`))}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-bold text-base">{owner.displayName}</h1>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>

      {!available ? (
        <UnavailableState
          title="Conexões indisponíveis"
          description="Esta lista ainda não está disponível."
          action={<Link href={`/profile/${owner.username}`} className="text-sm font-semibold text-primary hover:underline">Voltar ao perfil</Link>}
        />
      ) : (
      <>

      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
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
          <button type="button" className="font-semibold underline" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </button>
        </p>
      )}

      {loading && remoteAccounts.length === 0 && (
        <p role="status" className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando conexões…</p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center text-muted-foreground">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">
            {loading ? "Carregando conexões…" : q ? "Nenhuma conta encontrada para essa busca." : kind === "followers" ? "Esta conta ainda não tem seguidores." : "Você ainda não segue nenhuma conta."}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-testid={`user-card-${user.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <Link href={`/profile/${user.username}`} aria-label={`Ver perfil de ${user.displayName}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={user.avatarUrl} alt="" />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
                </div>
              </Link>
              {user.id !== currentUser?.id && (
                <button
                  type="button"
                  onClick={() => toggleFollow(user.id)}
                  data-testid={`button-follow-${user.id}`}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    user.isFollowing || user.followRequestSent ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {user.isFollowing ? "Seguindo" : user.followRequestSent ? "Cancelar" : user.isPrivate ? "Solicitar" : "Seguir"}
                </button>
              )}
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
      </>
      )}
    </div>
  );
}
