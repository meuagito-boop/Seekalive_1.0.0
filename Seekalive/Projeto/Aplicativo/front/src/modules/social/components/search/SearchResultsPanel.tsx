import { SearchPeopleResults } from "@/modules/social/components/search/SearchPeopleResults";
import { SearchPostResults } from "@/modules/social/components/search/SearchPostResults";
import { SearchTagResults } from "@/modules/social/components/search/SearchTagResults";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";
import type { TrendingTopic } from "@/modules/social/data/demoTrendingTopics";

interface SearchResultsPanelProps {
  activeTab: number;
  query: string;
  posts: Post[];
  users: User[];
  tags: TrendingTopic[];
  isRemoteSocialSession: boolean;
  normalizedQueryLength: number;
  isLoadingPeople: boolean;
  peopleError: string | null;
  nextPeopleCursor: string | null;
  onRetryPeople: () => void;
  onLoadMorePeople: () => void;
  onToggleFollow: (userId: string) => void;
}

export function SearchResultsPanel({
  activeTab,
  query,
  posts,
  users,
  tags,
  isRemoteSocialSession,
  normalizedQueryLength,
  isLoadingPeople,
  peopleError,
  nextPeopleCursor,
  onRetryPeople,
  onLoadMorePeople,
  onToggleFollow,
}: SearchResultsPanelProps) {
  return (
    <>
      <div id="search-panel-0" role="tabpanel" aria-labelledby="search-tab-0" hidden={activeTab !== 0} tabIndex={0}>
        {activeTab === 0 && <SearchPostResults posts={posts} query={query} />}
      </div>
      <div id="search-panel-1" role="tabpanel" aria-labelledby="search-tab-1" hidden={activeTab !== 1} tabIndex={0}>
        {activeTab === 1 && (
          <SearchPeopleResults
            users={users}
            isRemoteSocialSession={isRemoteSocialSession}
            normalizedQueryLength={normalizedQueryLength}
            isLoading={isLoadingPeople}
            error={peopleError}
            nextCursor={nextPeopleCursor}
            onRetry={onRetryPeople}
            onLoadMore={onLoadMorePeople}
            onToggleFollow={onToggleFollow}
          />
        )}
      </div>
      <div id="search-panel-2" role="tabpanel" aria-labelledby="search-tab-2" hidden={activeTab !== 2} tabIndex={0}>
        {activeTab === 2 && <SearchTagResults tags={tags} />}
      </div>
    </>
  );
}
