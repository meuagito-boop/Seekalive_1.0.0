import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon } from "lucide-react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import { demoTrendingTopics } from "@/modules/social/data/demoTrendingTopics";
import { SearchDiscoveryPanel } from "@/modules/social/components/search/SearchDiscoveryPanel";
import { SearchResultsPanel } from "@/modules/social/components/search/SearchResultsPanel";
import { useRemoteAccountSearch } from "@/modules/social/hooks/useRemoteAccountSearch";
import { normalizeSocialSearchQuery } from "@/modules/social/utils/searchQuery";
import { getSearchResults } from "@/modules/social/utils/searchResults";
import { handleTabKeyDown } from "@/modules/shared/ui/tabKeyboard";

const tabs = [
  { label: "Publicações", id: "Posts" },
  { label: "Pessoas", id: "Pessoas" },
  { label: "Tags", id: "Tags" },
];

export default function Search() {
  const { posts, users, toggleFollow, isRemoteSocialSession, upsertRemoteUser } = useSocial();
  const search = useSearch();
  const urlQuery = new URLSearchParams(search).get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const { currentUser } = useAppContext();
  const currentUserId = currentUser?.id;
  const viewerId = currentUserId ?? "me";
  const trendingTopics = import.meta.env.DEV ? demoTrendingTopics : [];
  const isSearching = query.trim().length > 0;
  const apiQuery = normalizeSocialSearchQuery(query);
  const remoteSearch = useRemoteAccountSearch({
    isRemoteSocialSession,
    normalizedQuery: apiQuery,
    currentUserId,
    upsertRemoteUser,
  });
  const { filteredPosts, filteredUsers, filteredTags, suggestedUsers } = getSearchResults({
    posts,
    users,
    query,
    viewerId,
    currentUserId,
    isRemoteSocialSession,
    remoteUsers: remoteSearch.users,
    trendingTopics,
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no Seekalive"
              aria-label="Buscar publicações, pessoas e tags"
              data-testid="input-search"
              className="h-10 w-full rounded-full border border-transparent bg-muted/50 pl-9 pr-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {isSearching && (
          <div role="tablist" aria-label="Tipos de resultado" className="flex border-t border-border">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`search-tab-${index}`}
                aria-controls={`search-panel-${index}`}
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                tabIndex={activeTab === index ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, index, tabs.length, setActiveTab)}
                onClick={() => setActiveTab(index)}
                data-testid={`tab-search-${tab.id}`}
                className={`flex-1 border-b-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeTab === index
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
          <SearchDiscoveryPanel
            key="discovery"
            trendingTopics={trendingTopics}
            suggestedUsers={suggestedUsers}
            isRemoteSocialSession={isRemoteSocialSession}
            onSearch={setQuery}
            onToggleFollow={(userId) => void toggleFollow(userId)}
          />
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SearchResultsPanel
              activeTab={activeTab}
              query={query}
              posts={filteredPosts}
              users={filteredUsers}
              tags={filteredTags}
              isRemoteSocialSession={isRemoteSocialSession}
              normalizedQueryLength={apiQuery.length}
              isLoadingPeople={remoteSearch.isLoading}
              peopleError={remoteSearch.error}
              nextPeopleCursor={remoteSearch.nextCursor}
              onRetryPeople={remoteSearch.retry}
              onLoadMorePeople={() => void remoteSearch.loadMore()}
              onToggleFollow={(userId) => void toggleFollow(userId)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
