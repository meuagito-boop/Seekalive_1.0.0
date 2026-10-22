import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { canReadPost } from "@/services/contentValidation";
import type { Post, User } from "@/data/mockData";

export type ReadablePost =
  | { state: "ok"; post: Post; author: User }
  | { state: "missing" }
  | { state: "forbidden" };

/** Resolves a post by exact id only — never falls back to an unrelated post. */
export function useReadablePost(postId: string | undefined): ReadablePost {
  const { posts, getUserById } = useSocial();
  const { currentUser } = useAppContext();
  const post = postId ? posts.find((p) => p.id === postId) : undefined;
  if (!post) return { state: "missing" };
  const author = getUserById(post.authorId);
  if (!author || author.isBlocked) return { state: "missing" };
  if (!canReadPost(post, currentUser?.id, author.isInCircle ?? false)) return { state: "forbidden" };
  return { state: "ok", post, author };
}
