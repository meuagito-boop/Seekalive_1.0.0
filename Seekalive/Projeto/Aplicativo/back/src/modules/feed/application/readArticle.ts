import { readPost } from "./readPost";

export async function readArticle(postId: string, viewerId: string | null) {
  const post = await readPost(postId, viewerId);
  return post?.format === "article" ? post : null;
}
