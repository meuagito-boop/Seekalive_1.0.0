import type { ReadPost } from "./readPost";

type ReferenceAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function createPostReferencePreviewReader(
  readPost: ReadPost,
  findAuthors: (
    ids: string[],
    viewerId: string | null,
  ) => Promise<ReferenceAuthor[]>,
) {
  return async function readPostReferencePreview(
    postId: string,
    viewerId: string | null,
  ) {
    const post = await readPost(postId, viewerId);
    if (!post) return null;

    const [author] = await findAuthors([post.authorId], viewerId);
    if (!author) return null;

    const imageIndex = post.mediaTypes?.findIndex((type) => type === "image") ?? -1;
    const title =
      post.article?.title ??
      post.content.trim().slice(0, 200) ??
      "Publicação com mídia";

    return {
      type: "social_post" as const,
      id: post.id,
      title: title || "Publicação com mídia",
      ...(imageIndex >= 0
        ? { imageUrl: post.mediaUrls?.[imageIndex] }
        : {}),
      subtitle: `@${author.username}`,
      targetPath:
        post.format === "article"
          ? `/article/${encodeURIComponent(post.id)}`
          : `/post/${encodeURIComponent(post.id)}`,
      authorName: author.displayName,
      ...(author.avatarUrl ? { authorAvatarUrl: author.avatarUrl } : {}),
      entityLabel: post.format === "article" ? "Artigo Social" : "Publicação Social",
    };
  };
}

export type ReadPostReferencePreview = ReturnType<
  typeof createPostReferencePreviewReader
>;
