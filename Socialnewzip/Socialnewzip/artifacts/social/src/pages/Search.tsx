import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { canReadPost } from "@/services/contentValidation";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, TrendingUp, Users, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post/PostCard";
import { mockCommunities, formatCount } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";

const tabs = ["Posts", "Pessoas", "Comunidades", "Tags"];

const trending = [
  { tag: "#ReactJS", category: "Tecnologia", count: 12500 },
  { tag: "#DarkMode", category: "Design", count: 8200 },
  { tag: "#AItools", category: "Tecnologia", count: 34100 },
  { tag: "#Orbit", category: "Social", count: 5600 },
  { tag: "#OpenSource", category: "Dev", count: 9800 },
  { tag: "#TypeScript", category: "Tecnologia", count: 15200 },
];

export default function Search() {
  const { posts, users, toggleFollow } = useSocial();
  const search = useSearch();
  const urlQuery = new URLSearchParams(search).get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const { currentUser } = useAppContext();
  const viewerId = currentUser?.id ?? "me";
  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);
  const [activeTab, setActiveTab] = useState(0);

  const isSearching = query.trim().length > 0;

  const q = query.trim().toLowerCase();
  const filteredPosts = posts.filter(p => {
    const author = users.find(u => u.id === p.authorId);
    if (!canReadPost(p, viewerId, author?.isInCircle ?? false)) return false;
    const haystack = [p.content, p.article?.title ?? "", p.article?.body ?? "", ...(p.hashtags ?? []).map(t => `#${t}`), ...(p.mentions ?? []).map(m => `@${m}`)].join(" ").toLowerCase();
    return haystack.includes(q);
  });
  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );
  const filteredCommunities = mockCommunities.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );
  const filteredTags = trending.filter(t =>
    t.tag.toLowerCase().includes(query.toLowerCase())
  );

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
              placeholder="Buscar no SeekAlive"
              data-testid="input-search"
              className="w-full h-10 pl-9 pr-4 bg-muted/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {isSearching && (
          <div className="flex border-t border-border">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                data-testid={`tab-search-${tab}`}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
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
                <h2 className="font-bold text-lg">Trending</h2>
              </div>
              <div className="space-y-1">
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
                      <p className="text-xs text-muted-foreground">{t.category} · Trending</p>
                      <p className="font-bold text-base">{t.tag}</p>
                      <p className="text-xs text-muted-foreground">{formatCount(t.count)} posts</p>
                    </div>
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* People suggestions */}
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Pessoas para seguir</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {users.slice(0, 5).map(user => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="shrink-0 w-40 p-3 bg-card rounded-2xl border border-border flex flex-col items-center gap-2"
                    data-testid={`suggest-${user.id}`}
                  >
                    <Link href={`/profile/${user.username}`}>
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="text-center">
                      <p className="font-semibold text-xs truncate w-full">{user.displayName}</p>
                      <p className="text-muted-foreground text-xs">@{user.username}</p>
                    </div>
                    <button
                      onClick={() => toggleFollow(user.id)}
                      data-testid={`button-follow-${user.id}`}
                      className={`w-full py-1.5 rounded-full text-xs font-semibold transition-all ${
                        user.isFollowing ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {user.isFollowing ? "Seguindo" : "Seguir"}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Communities */}
            <div className="px-4 pt-2 pb-6">
              <h2 className="font-bold text-lg mb-4">Comunidades em alta</h2>
              <div className="grid grid-cols-1 gap-3">
                {mockCommunities.slice(0, 3).map(community => (
                  <Link key={community.id} href={`/communities/${community.id}`} data-testid={`community-suggest-${community.id}`}>
                    <div className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/40 transition-colors">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                        {community.iconUrl ? (
                          <img src={community.iconUrl} alt={community.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {community.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{community.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCount(community.memberCount)} membros · {community.category}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Posts */}
            {activeTab === 0 && (
              filteredPosts.length === 0
                ? <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhum post encontrado para "{query}"</p></div>
                : filteredPosts.map(post => <PostCard key={post.id} post={post} />)
            )}

            {/* People */}
            {activeTab === 1 && (
              filteredUsers.length === 0
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
                    <Link href={`/profile/${user.username}`}>
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.bio.slice(0, 70)}</p>
                    </div>
                    <button
                      onClick={() => toggleFollow(user.id)}
                      data-testid={`button-follow-result-${user.id}`}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        user.isFollowing ? "bg-muted text-muted-foreground border border-border" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {user.isFollowing ? "Seguindo" : "Seguir"}
                    </button>
                  </motion.div>
                ))
            )}

            {/* Communities */}
            {activeTab === 2 && (
              filteredCommunities.length === 0
                ? <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma comunidade encontrada</p></div>
                : filteredCommunities.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/communities/${c.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20 transition-colors" data-testid={`result-community-${c.id}`}>
                      <Avatar className="w-11 h-11 rounded-xl">
                        <AvatarImage src={c.iconUrl} />
                        <AvatarFallback className="rounded-xl">{c.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCount(c.memberCount)} membros · {c.category}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description.slice(0, 70)}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))
            )}

            {/* Tags */}
            {activeTab === 3 && (
              filteredTags.length === 0
                ? <div className="py-16 text-center text-muted-foreground"><p className="font-medium">Nenhuma tag encontrada</p></div>
                : filteredTags.map((t, i) => (
                  <motion.div
                    key={t.tag}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-4 py-4 border-b border-border hover:bg-muted/20 cursor-pointer"
                    data-testid={`result-tag-${t.tag}`}
                  >
                    <div>
                      <p className="font-bold text-base">{t.tag}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · {formatCount(t.count)} posts</p>
                    </div>
                    <Hash className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
