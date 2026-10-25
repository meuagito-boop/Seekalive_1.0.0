import { canReadPost } from "@/modules/shared/content/contentValidation";
import type { TrendingTopic } from "@/modules/social/data/demoTrendingTopics";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";

interface SearchResultsInput {
  posts: Post[];
  users: User[];
  query: string;
  viewerId: string;
  currentUserId: string | undefined;
  isRemoteSocialSession: boolean;
  remoteUsers: User[];
  trendingTopics: TrendingTopic[];
}

export function getSearchResults({
  posts,
  users,
  query,
  viewerId,
  currentUserId,
  isRemoteSocialSession,
  remoteUsers,
  trendingTopics,
}: SearchResultsInput) {
  const normalized = query.trim().toLowerCase();
  const filteredPosts = posts.filter((post) => {
    const author = users.find((user) => user.id === post.authorId);
    if (!author || !canReadPost(
      post,
      viewerId,
      author.isInCircle ?? false,
      author.isPrivate ?? false,
      author.isFollowing ?? false,
    )) return false;

    const searchableText = [
      post.content,
      post.article?.title ?? "",
      post.article?.body ?? "",
      ...(post.hashtags ?? []).map((tag) => `#${tag}`),
      ...(post.mentions ?? []).map((mention) => `@${mention}`),
    ].join(" ").toLowerCase();
    return searchableText.includes(normalized);
  });

  const filteredUsers = isRemoteSocialSession
    ? remoteUsers
    : users.filter((user) =>
      user.displayName.toLowerCase().includes(normalized)
      || user.username.toLowerCase().includes(normalized.replace(/^@/, "")),
    );
  const filteredTags = trendingTopics.filter((topic) =>
    topic.tag.toLowerCase().includes(normalized),
  );
  const suggestedUsers = isRemoteSocialSession
    ? []
    : users.filter((user) => user.id !== currentUserId).slice(0, 5);

  return { filteredPosts, filteredUsers, filteredTags, suggestedUsers };
}
