import { useCallback, useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { normalizeHashtag, normalizeHashtagPrefix } from "@workspace/api-zod";
import { useAppContext } from "@/modules/app/state/AppContext";
import { canReadPost } from "@/modules/social/application/contentValidation";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, TrendingUp, Users, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/modules/social/components/post/PostCard";
import { formatCount } from "@/lib/formatters";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { accountListToUsers, socialGraphApi } from "@/modules/social/services/socialGraphApi";
import { handleTabKeyDown } from "@/lib/tabKeyboard";
import {
  useRemoteFeedSearch,
  type FeedSearchPage,
} from "@/modules/social/hooks/useRemoteFeedSearch";

const tabs = [
  { label: "Publicações", id: "Posts" },
  { label: "Pessoas", id: "Pessoas" },
  { label: "Tags", id: "Tags" },
];

const demoTrending = [
  { tag: "#ReactJS", category: "Tecnologia", count: 12500 },
  { tag: "#DarkMode", category: "Design", count: 8200 },
  { tag: "#AItools", category: "Tecnologia", count: 34100 },
  { tag: "#Seekalive", category: "Social", count: 5600 },
  { tag: "#OpenSource", category: "Dev", count: 9800 },
  { tag: "#TypeScript", category: "Tecnologia", count: 15200 },
];

export default function Search() {
  const {
    posts,
    users,
    toggleFollow,
    isRemoteSocialSession,
    upsertRemoteUser,
    dispatch,
  } = useSocial();
  const search = useSearch();
  const urlQuery = new URLSearchParams(search).get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const { currentUser } = useAppContext();
  const viewerId = currentUser?.id ?? "me";
  const trending =
    import.meta.env.DEV && !isRemoteSocialSession ? demoTrending : [];
  const suggestedUsers = isRemoteSocialSession
    ? []
    : users.filter(user => user.id !== currentUser?.id).slice(0, 5);
  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);
  const [activeTab, setActiveTab] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState<ReturnType<typeof accountListToUsers>>([]);
  const [remoteSearchCursor, setRemoteSearchCursor] = useState<string | null>(null);
  const [remoteSearchLoading, setRemoteSearchLoading] = useState(false);
  const [remoteSearchError, setRemoteSearchError] = useState<string | null>(null);
  const [searchRetry, setSearchRetry] = useState(0);

  const isSearching = query.trim().length > 0;

  const q = query.trim().toLowerCase();
  const feedSearchQuery = query.trim();
  const apiQuery = query.trim().replace(/^@/, "");
  const handleRemoteFeedPage = useCallback((page: FeedSearchPage) => {
    page.authors.forEach(upsertRemoteUser);
    page.items.forEach((post) => dispatch({ type: "UPSERT_POST", post }));
  }, [dispatch, upsertRemoteUser]);
  const remoteFeedSearch = useRemoteFeedSearch({
    enabled:
      isRemoteSocialSession &&
      isSearching &&
      feedSearchQuery.length >= 2 &&
      (activeTab === 0 || activeTab === 2),
    query: feedSearchQuery,
    onPage: handleRemoteFeedPage,
  });
  useEffect(() => {
    if (!isRemoteSocialSession || apiQuery.length < 2) {
      setRemoteUsers([]);
      setRemoteSearchCursor(null);
      setRemoteSearchError(null);
      setRemoteSearchLoading(false);
      return;
    }

    let active = true;
    setRemoteUsers([]);
    setRemoteSearchCursor(null);
    setRemoteSearchError(null);
    const timer = window.setTimeout(() => {
      setRemoteSearchLoading(true);
      setRemoteSearchError(null);
      void socialGraphApi.searchAccounts(query.trim())
        .then((page) => {
          if (!active) return;
          const accounts = accountListToUsers(page.items)
            .filter((account) => account.id !== currentUser?.id);
          accounts.forEach(upsertRemoteUser);
          setRemoteUsers(accounts);
          setRemoteSearchCursor(page.nextCursor);
        })
        .catch((searchError: unknown) => {
          if (active) setRemoteSearchError(searchError instanceof Error ? searchError.message : "Não foi possível buscar pessoas.");
        })
        .finally(() => {
          if (active) setRemoteSearchLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isRemoteSocialSession, apiQuery, query, searchRetry, currentUser?.id, upsertRemoteUser]);

  async function loadMoreAccounts() {
    if (!remoteSearchCursor || remoteSearchLoading) return;
    setRemoteSearchLoading(true);
    setRemoteSearchError(null);
    try {
      const page = await socialGraphApi.searchAccounts(query.trim(), remoteSearchCursor);
      const accounts = accountListToUsers(page.items)
        .filter((account) => account.id !== currentUser?.id);
      accounts.forEach(upsertRemoteUser);
      setRemoteUsers((existing) => [
        ...existing,
        ...accounts.filter((account) => !existing.some((item) => item.id === account.id)),
      ]);
      setRemoteSearchCursor(page.nextCursor);
    } catch (searchError) {
      setRemoteSearchError(searchError instanceof Error ? searchError.message : "Não foi possível carregar mais pessoas.");
    } finally {
      setRemoteSearchLoading(false);
    }
  }

  const filteredPosts = posts.filter(p => {
    const author = users.find(u => u.id === p.authorId);
    if (!author || !canReadPost(p, viewerId, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false)) return false;
    const haystack = [p.content, p.article?.title ?? "", p.article?.body ?? "", ...(p.hashtags ?? []).map(t => `#${t}`), ...(p.mentions ?? []).map(m => `@${m}`)].join(" ").toLowerCase();
    return haystack.includes(q);
  });
  const filteredUsers = isRemoteSocialSession
    ? remoteUsers
    : users.filter(u =>
      u.displayName.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase())
    );
  const filteredTags = trending.filter(t =>
    t.tag.toLowerCase().includes(query.toLowerCase())
  );
  const hashtagPrefix = normalizeHashtagPrefix(feedSearchQuery);
  const remoteTagMap = new Map<string, string>();
  if (hashtagPrefix) {
    for (const tag of remoteFeedSearch.posts.flatMap((post) => post.hashtags ?? [])) {
      const normalizedTag = normalizeHashtag(tag);
      if (
        normalizedTag.startsWith(hashtagPrefix) &&
        !remoteTagMap.has(normalizedTag)
      ) {
        remoteTagMap.set(normalizedTag, tag);
      }
    }
  }
  const remoteTags = [...remoteTagMap.values()];

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar no Seekalive"
              data-testid="input-search"
              className="w-full h-10 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {isSearching && (
          <div role="tablist" aria-label="Tipos de resultado" className="flex border-t border-border">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                id={`search-tab-${i}`}
                aria-controls={`search-panel-${i}`}
                type="button"
                role="tab"
                aria-selected={activeTab === i}
                tabIndex={activeTab === i ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, i, tabs.length, setActiveTab)}
                onClick={() => setActiveTab(i)}
                data-testid={`tab-search-${tab.id}`}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isSearching ? (
          <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Trending */}
            <div className="px-4 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Em alta</h2>
              </div>
              {trending.length > 0 ? <div className="space-y-1">
                {trending.map((t, i) => (
                  <motion.button
                    key={t.tag}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setQuery(t.tag)}
                    data-testid={`trending-${t.tag}`}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted/40 transition-colors text-left"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{t.category} · Em alta</p>
                      <p className="font-bold text-base">{t.tag}</p>
                      <p className="text-xs text-muted-foreground">{formatCount(t.count)} publicações</p>
                    </div>
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">As tendências aparecerão quando houver publicações reais.</p>}
            </div>

            {/* People suggestions */}
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Pessoas para seguir</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {suggestedUsers.length > 0 ? suggestedUsers.map(user => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="shrink-0 w-40 p-3 bg-card rounded-2xl border border-border flex flex-col items-center gap-2"
                    data-testid={`suggest-${user.id}`}
                  >
                    <Link href={`/profile/${user.username}`} aria-label={`Ver perfil de ${user.displayName}`}>
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="text-center">
                      <p className="font-semibold text-xs truncate w-full">{user.displayName}</p>
                      <p className="text-muted-foreground text-xs truncate">@{user.username}</p>
                    </div>
                    <button
                      aria-label={`${user.isFollowing ? "Deixar de seguir" : user.followRequestSent ? "Cancelar solicitação para seguir" : user.isPrivate ? "Solicitar para seguir" : "Seguir"} ${user.displayName}`}
                      onClick={() => toggleFollow(user.id)}
                      data-testid={`button-follow-${user.id}`}
                      className={`w-full py-1.5 rounded-full text-xs font-semibold transition-all ${
                        user.isFollowing || user.followRequestSent ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {user.isFollowing ? "Seguindo" : user.followRequestSent ? "Cancelar" : user.isPrivate ? "Solicitar" : "Seguir"}
                    </button>
                  </motion.div>
                )) : <p className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {isRemoteSocialSession
                    ? "Busque por nome ou @ para encontrar contas verificadas."
                    : "Novas pessoas aparecerão quando houver contas disponíveis."}
                </p>}
              </div>
            </div>

          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Posts */}
            <div id="search-panel-0" role="tabpanel" aria-labelledby="search-tab-0" hidden={activeTab !== 0} tabIndex={0}>
            {activeTab === 0 && (
              isRemoteSocialSession && remoteFeedSearch.error ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p role="alert" className="font-medium text-destructive">{remoteFeedSearch.error}</p>
                  <button type="button" className="mt-3 text-sm font-semibold text-primary underline" onClick={remoteFeedSearch.retry}>Tentar novamente</button>
                </div>
              ) : isRemoteSocialSession && feedSearchQuery.length < 2 ? (
                <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Digite pelo menos 2 caracteres para buscar.</p></div>
              ) : isRemoteSocialSession && remoteFeedSearch.loading && remoteFeedSearch.posts.length === 0 ? (
                <div role="status" className="py-16 text-center text-muted-foreground"><p className="font-medium">Buscando publicações…</p></div>
              ) : (isRemoteSocialSession ? remoteFeedSearch.posts : filteredPosts).length === 0
                ? <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma publicação encontrada para "{query}"</p></div>
                : (isRemoteSocialSession ? remoteFeedSearch.posts : filteredPosts).map(post => <PostCard key={post.id} post={post} />)
            )}
            {activeTab === 0 && isRemoteSocialSession && remoteFeedSearch.cursor && (
              <div className="flex justify-center px-4 py-5">
                <button
                  type="button"
                  onClick={() => void remoteFeedSearch.loadMore()}
                  disabled={remoteFeedSearch.loading}
                  className="rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {remoteFeedSearch.loading ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
            </div>

            {/* People */}
            <div id="search-panel-1" role="tabpanel" aria-labelledby="search-tab-1" hidden={activeTab !== 1} tabIndex={0}>
            {activeTab === 1 && (
              isRemoteSocialSession && remoteSearchError ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p role="alert" className="font-medium text-destructive">{remoteSearchError}</p>
                  <button type="button" className="mt-3 text-sm font-semibold text-primary underline" onClick={() => setSearchRetry((value) => value + 1)}>Tentar novamente</button>
                </div>
              ) : isRemoteSocialSession && apiQuery.length < 2 ? (
                <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Digite pelo menos 2 caracteres para buscar.</p></div>
              ) : remoteSearchLoading && filteredUsers.length === 0 ? (
                <div role="status" className="py-16 text-center text-muted-foreground"><p className="font-medium">Buscando pessoas…</p></div>
              ) : filteredUsers.length === 0
                ? <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma pessoa encontrada</p></div>
                : filteredUsers.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors"
                    data-testid={`result-user-${user.id}`}
                  >
                    <Link href={`/profile/${user.username}`} aria-label={`Ver perfil de ${user.displayName}`}>
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.bio.slice(0, 70)}</p>
                    </div>
                    <button
                      aria-label={`${user.isFollowing ? "Deixar de seguir" : user.followRequestSent ? "Cancelar solicitação para seguir" : user.isPrivate ? "Solicitar para seguir" : "Seguir"} ${user.displayName}`}
                      onClick={() => toggleFollow(user.id)}
                      data-testid={`button-follow-result-${user.id}`}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        user.isFollowing || user.followRequestSent ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {user.isFollowing ? "Seguindo" : user.followRequestSent ? "Cancelar" : user.isPrivate ? "Solicitar" : "Seguir"}
                    </button>
                  </motion.div>
                ))
            )}
            {activeTab === 1 && isRemoteSocialSession && remoteSearchCursor && (
              <div className="flex justify-center px-4 py-5">
                <button
                  type="button"
                  onClick={() => void loadMoreAccounts()}
                  disabled={remoteSearchLoading}
                  className="rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {remoteSearchLoading ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
            </div>

            {/* Tags */}
            <div id="search-panel-2" role="tabpanel" aria-labelledby="search-tab-2" hidden={activeTab !== 2} tabIndex={0}>
            {activeTab === 2 && (
              isRemoteSocialSession && remoteFeedSearch.error ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p role="alert" className="font-medium text-destructive">{remoteFeedSearch.error}</p>
                  <button type="button" className="mt-3 text-sm font-semibold text-primary underline" onClick={remoteFeedSearch.retry}>Tentar novamente</button>
                </div>
              ) : isRemoteSocialSession && !hashtagPrefix ? (
                <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Digite uma hashtag ou prefixo de hashtag.</p></div>
              ) : isRemoteSocialSession && remoteFeedSearch.loading && remoteFeedSearch.posts.length === 0 ? (
                <div role="status" className="py-16 text-center text-muted-foreground"><p className="font-medium">Buscando hashtags…</p></div>
              ) : (isRemoteSocialSession ? remoteTags : filteredTags.map((tag) => tag.tag.slice(1))).length === 0
                ? <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma tag encontrada</p></div>
                : (isRemoteSocialSession ? remoteTags : filteredTags.map((tag) => tag.tag.slice(1))).map((tag, i) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      setQuery(`#${tag}`);
                      setActiveTab(0);
                    }}
                    className="flex cursor-pointer items-center justify-between px-4 py-4 border-b border-border"
                    data-testid={`result-tag-#${tag}`}
                  >
                    <div>
                      <p className="font-bold text-base">#{tag}</p>
                      {!isRemoteSocialSession && (
                        <p className="text-xs text-muted-foreground">Dados de demonstração</p>
                      )}
                    </div>
                    <Hash className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                ))
            )}
            {activeTab === 2 && isRemoteSocialSession && remoteFeedSearch.cursor && (
              <div className="flex justify-center px-4 py-5">
                <button
                  type="button"
                  onClick={() => void remoteFeedSearch.loadMore()}
                  disabled={remoteFeedSearch.loading}
                  className="rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {remoteFeedSearch.loading ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
