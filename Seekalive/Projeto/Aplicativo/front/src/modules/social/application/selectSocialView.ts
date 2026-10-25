import type { User } from "@/modules/profile/types/user";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { Post } from "@/modules/social/types/post";
import type { SocialActivity } from "@/modules/social/types/socialActivity";
import type { SocialComment, SocialRepost } from "@/modules/social/types/posts";
import { areMutualFollowers, viewerFollowsUser } from "@/modules/social/domain/followRelationships";

interface SelectSocialViewInput {
  posts: Post[];
  comments: SocialComment[];
  repostEntries: SocialRepost[];
  users: User[];
  followRequests: FollowRequest[];
  viewer?: User | null;
  isRemoteSocialSession: boolean;
  blockedUserIds: Set<string>;
  accountsBlockingViewerIds: Set<string>;
  blockedAccountIds: Set<string>;
  accountActivity: SocialActivity;
  accountActivities: SocialActivity[];
}

export function selectSocialView({
  posts: sourcePosts,
  comments: sourceComments,
  repostEntries: sourceReposts,
  users: sourceUsers,
  followRequests,
  viewer,
  isRemoteSocialSession,
  blockedUserIds,
  accountsBlockingViewerIds,
  blockedAccountIds,
  accountActivity,
  accountActivities,
}: SelectSocialViewInput) {
  const blockedPostIds = new Set(
    sourcePosts.filter((post) => blockedAccountIds.has(post.authorId)).map((post) => post.id),
  );
  const posts = sourcePosts.map((post) => ({
    ...post,
    isLiked: accountActivity.likedPostIds.includes(post.id),
    isBookmarked: accountActivity.bookmarkedPostIds.includes(post.id),
    isReposted: accountActivity.reposts.some((repost) => repost.postId === post.id),
    likes: post.likes + accountActivities.filter((activity) => activity.likedPostIds.includes(post.id)).length,
    reposts: post.reposts + accountActivities.reduce(
      (count, activity) => count + activity.reposts.filter((repost) => repost.postId === post.id).length,
      0,
    ),
  }));
  const comments = sourceComments.map((comment) => ({
    ...comment,
    isLiked: accountActivity.likedCommentIds.includes(comment.id),
    likes: comment.likes + accountActivities.filter((activity) => activity.likedCommentIds.includes(comment.id)).length,
  }));
  const repostEntries = [
    ...sourceReposts,
    ...accountActivities.flatMap((activity) => activity.reposts),
  ].filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) === index);
  const users = sourceUsers.map((user) => ({
    ...user,
    isBlockedByViewer: blockedUserIds.has(user.id)
      || (!isRemoteSocialSession && Boolean(user.isBlockedByViewer)),
    blocksViewer: !isRemoteSocialSession && accountsBlockingViewerIds.has(user.id),
    isBlocked: blockedUserIds.has(user.id)
      || (!isRemoteSocialSession && accountsBlockingViewerIds.has(user.id))
      || (isRemoteSocialSession && user.source === "server" && Boolean(user.isBlocked)),
    isFollowing: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.isFollowing)
      : viewer ? viewerFollowsUser(viewer, user) : false,
    followRequestSent: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.followRequestSent)
      : !!viewer
        && !blockedUserIds.has(user.id)
        && !accountsBlockingViewerIds.has(user.id)
        && followRequests.some((request) =>
          request.requesterId === viewer.id && request.targetId === user.id
        ),
    isInCircle: isRemoteSocialSession
      ? user.source === "server" && Boolean(user.isInCircle)
      : viewer ? areMutualFollowers(viewer, user) : false,
  }));

  return { posts, comments, repostEntries, users, blockedPostIds };
}
