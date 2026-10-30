import { useEffect, useState } from "react";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import { canReadPost } from "@/modules/social/application/contentValidation";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";

export type ReadablePost =
  | { state: "ok"; post: Post; author: User }
  | { state: "loading" }
  | { state: "missing" }
  | { state: "forbidden" };

/** Resolves a post by exact id only — never falls back to an unrelated post. */
export function useReadablePost(postId: string | undefined): ReadablePost {
  const {
    posts,
    remotePosts,
    getUserById,
    loadRemotePost,
    isRemoteSocialSession,
  } = useSocial();
  const { currentUser } = useAppContext();
  const post = postId
    ? posts.find((item) => item.id === postId) ??
      remotePosts.find((item) => item.id === postId)
    : undefined;
  const authorLoaded = !!post && !!getUserById(post.authorId);
  const [remoteLoad, setRemoteLoad] = useState<{
    postId: string | undefined;
    state: "loading" | "failed";
  } | null>(null);

  useEffect(() => {
    if (!postId || !isRemoteSocialSession || (post && authorLoaded)) return;
    let active = true;
    setRemoteLoad({ postId, state: "loading" });
    loadRemotePost(postId)
      .then((loadedPost) => {
        if (active && !loadedPost) setRemoteLoad({ postId, state: "failed" });
      })
      .catch(() => {
        if (active) setRemoteLoad({ postId, state: "failed" });
      });
    return () => {
      active = false;
    };
  }, [postId, isRemoteSocialSession, post?.id, authorLoaded, loadRemotePost]);

  if (!post) {
    if (isRemoteSocialSession && postId && remoteLoad?.postId !== postId) {
      return { state: "loading" };
    }
    if (remoteLoad && remoteLoad.postId === postId && remoteLoad.state === "loading") {
      return { state: "loading" };
    }
    return { state: "missing" };
  }
  const author = getUserById(post.authorId);
  if (!author && isRemoteSocialSession && post.source === "server") {
    return { state: "loading" };
  }
  if (!author || author.isBlocked) return { state: "missing" };
  if (isRemoteSocialSession && post.source === "server") {
    return { state: "ok", post, author };
  }
  if (!canReadPost(post, currentUser?.id, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false)) return { state: "forbidden" };
  return { state: "ok", post, author };
}
