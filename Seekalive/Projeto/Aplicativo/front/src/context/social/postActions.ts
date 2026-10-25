import type { Dispatch } from "react";
import type { User } from "@/data/mockData";
import type { PublishPostInput, SocialComment } from "@/types/social/posts";
import { assertCommentParent } from "@/services/contentValidation";
import { contentService, ContentServiceError } from "@/services/contentService";
import type { SocialAction, SocialState } from "@/context/social/state";
import type { SocialAccountActivity } from "@/data/socialAccountActivityStorage";

type PostActionDependencies = {
  state: SocialState;
  currentUser: User | null;
  dispatch: Dispatch<SocialAction>;
  updateCurrentActivity: (
    update: (current: SocialAccountActivity) => SocialAccountActivity,
  ) => void;
  assertSession: (authorId: string) => void;
  assertReadable: (postId: string) => SocialState["posts"][number];
};

export function createSocialPostActions(dependencies: PostActionDependencies) {
  const { state, currentUser, dispatch, updateCurrentActivity, assertSession, assertReadable } =
    dependencies;

  return {
    toggleLike: (postId: string) => updateCurrentActivity((current) => ({
      ...current,
      likedPostIds: current.likedPostIds.includes(postId)
        ? current.likedPostIds.filter((id) => id !== postId)
        : [...current.likedPostIds, postId],
    })),
    toggleRepost: (postId: string, actorId = currentUser?.id ?? "") => {
      assertSession(actorId);
      const post = assertReadable(postId);
      if (post.audience !== "public") {
        throw new ContentServiceError("Somente publicações públicas podem ser repostadas.", 403);
      }
      updateCurrentActivity((current) => {
        const existing = current.reposts.some((repost) => repost.postId === postId);
        return {
          ...current,
          reposts: existing
            ? current.reposts.filter((repost) => repost.postId !== postId)
            : [...current.reposts, {
                id: `repost_${actorId}_${postId}`,
                postId,
                authorId: actorId,
                createdAt: new Date().toISOString(),
              }],
        };
      });
    },
    publishPost: async (input: PublishPostInput) => {
      assertSession(input.authorId);
      const post = await contentService.createPost(input);
      dispatch({ type: "ADD_POST", post });
      return post;
    },
    addComment: async (
      postId: string,
      content: string,
      authorId: string,
      replyToCommentId?: string,
    ): Promise<SocialComment> => {
      assertSession(authorId);
      assertReadable(postId);
      assertCommentParent(state.postComments, postId, replyToCommentId);
      const comment = await contentService.createComment(postId, content, authorId, replyToCommentId);
      dispatch({ type: "ADD_COMMENT", comment });
      return comment;
    },
    toggleCommentLike: (commentId: string) => {
      if (!currentUser) throw new ContentServiceError("Entre na sua conta para curtir.", 401);
      const comment = state.postComments.find((item) => item.id === commentId);
      if (!comment) throw new ContentServiceError("Comentário indisponível.", 404);
      assertReadable(comment.postId);
      updateCurrentActivity((current) => ({
        ...current,
        likedCommentIds: current.likedCommentIds.includes(commentId)
          ? current.likedCommentIds.filter((id) => id !== commentId)
          : [...current.likedCommentIds, commentId],
      }));
    },
    deletePost: async (postId: string, authorId: string) => {
      assertSession(authorId);
      const post = assertReadable(postId);
      if (post.authorId !== authorId) {
        throw new ContentServiceError("Somente o autor pode excluir a publicação.", 403);
      }
      dispatch({ type: "DELETE_POST", postId });
    },
    toggleBookmark: (postId: string) => updateCurrentActivity((current) => ({
      ...current,
      bookmarkedPostIds: current.bookmarkedPostIds.includes(postId)
        ? current.bookmarkedPostIds.filter((id) => id !== postId)
        : [...current.bookmarkedPostIds, postId],
    })),
    addPost: (
      content: string,
      audience: "public" | "circles" | "private",
      authorId: string,
      mediaUrls: string[] = [],
      mediaTypes: ("image" | "video")[] = [],
    ) => dispatch({
      type: "ADD_POST",
      post: {
        id: `post_${Date.now()}`,
        authorId,
        content,
        mediaUrls,
        mediaTypes,
        audience,
        type: mediaTypes.includes("video") ? "video" : "text",
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        reposts: 0,
        shares: 0,
        isLiked: false,
        isReposted: false,
      },
    }),
  };
}
