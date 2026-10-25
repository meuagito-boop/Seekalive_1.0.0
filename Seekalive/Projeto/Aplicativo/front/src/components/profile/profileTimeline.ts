export interface ProfileTimelinePost {
  id: string;
  authorId: string;
  createdAt: string;
}

export interface ProfileTimelineRepost {
  id: string;
  authorId: string;
  postId: string;
  createdAt: string;
}

export interface ProfileTimelineEntry<TPost> {
  key: string;
  post: TPost;
  at: string;
  repostedById: string | undefined;
}

export function buildProfileTimeline<
  TPost extends ProfileTimelinePost,
  TRepost extends ProfileTimelineRepost,
>(
  posts: readonly TPost[],
  reposts: readonly TRepost[],
  accountId: string,
  canRead: (post: TPost) => boolean,
): ProfileTimelineEntry<TPost>[] {
  const authoredPosts = posts.flatMap((post) =>
    post.authorId === accountId && canRead(post)
      ? [{ key: post.id, post, at: post.createdAt, repostedById: undefined }]
      : [],
  );
  const repostedPosts = reposts
    .filter((repost) => repost.authorId === accountId)
    .flatMap((repost) => {
      const post = posts.find((candidate) => candidate.id === repost.postId);
      return post && canRead(post)
        ? [{ key: repost.id, post, at: repost.createdAt, repostedById: repost.authorId }]
        : [];
    });

  return [...authoredPosts, ...repostedPosts].sort((left, right) =>
    right.at.localeCompare(left.at),
  );
}
