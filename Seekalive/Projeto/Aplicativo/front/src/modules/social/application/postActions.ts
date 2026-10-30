import type { Dispatch } from "react";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";
import type { PublishPostInput, SocialComment } from "@/modules/social/types/posts";
import { assertCommentParent } from "@/modules/social/application/contentValidation";
import { contentService } from "@/modules/social/services/contentService";
import { restContentAdapter } from "@/modules/social/services/restContentService";
import { restSocialApi } from "@/modules/social/services/restContracts";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";
import type { SocialContentAction, SocialContentState } from "@/modules/social/state/contentReducer";
import type { AccountActivity } from "@/modules/app/persistence/accountActivityStorage";

type PostActionDependencies = {
  state: SocialContentState;
  currentUser: User | null;
  dispatch: Dispatch<SocialContentAction>;
  updateCurrentActivity: (
    update: (current: AccountActivity) => AccountActivity,
  ) => void;
  assertSession: (authorId: string) => void;
  assertReadable: (postId: string) => Post;
  isRemoteSocialSession: boolean;
};

export function createSocialPostActions(dependencies: PostActionDependencies) {
  const {
    state,
    currentUser,
    dispatch,
    updateCurrentActivity,
    assertSession,
    assertReadable,
    isRemoteSocialSession,
  } =
    dependencies;

  return {
    toggleLike: async (postId: string) => {
      const post = assertReadable(postId);
      if (isRemoteSocialSession) {
        const updated = await restSocialApi.setLiked(postId, !post.isLiked);
        dispatch({ type: "UPSERT_POST", post: updated });
        return;
      }
      updateCurrentActivity((current) => ({
        ...current,
        likedPostIds: current.likedPostIds.includes(postId)
          ? current.likedPostIds.filter((id) => id !== postId)
          : [...current.likedPostIds, postId],
      }));
    },
    toggleRepost: async (postId: string, actorId = currentUser?.id ?? "") => {
      assertSession(actorId);
      const post = assertReadable(postId);
      if (post.audience !== "public") {
        throw new ContentServiceError("Somente publicações públicas podem ser repostadas.", 403);
      }
      if (isRemoteSocialSession) {
        const updated = await restSocialApi.setReposted(postId, !post.isReposted);
        dispatch({ type: "UPSERT_POST", post: updated });
        return;
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
      const post = isRemoteSocialSession
        ? await restContentAdapter.createPost(input)
        : await contentService.createPost(input);
      dispatch({
        type: post.source === "server" ? "UPSERT_POST" : "ADD_POST",
        post,
      });
      return post;
    },
    addComment: async (
      postId: string,
      content: string,
      authorId: string,
      replyToCommentId?: string,
      idempotencyKey?: string,
    ): Promise<SocialComment> => {
      assertSession(authorId);
      assertReadable(postId);
      assertCommentParent(state.postComments, postId, replyToCommentId);
      const mutationKey = idempotencyKey ?? crypto.randomUUID();
      const comment = isRemoteSocialSession
        ? await restContentAdapter.createComment(
            postId,
            content,
            authorId,
            replyToCommentId,
            mutationKey,
          )
        : await contentService.createComment(
            postId,
            content,
            authorId,
            replyToCommentId,
            mutationKey,
          );
      dispatch({ type: "ADD_COMMENT", comment });
      return comment;
    },
    toggleCommentLike: async (commentId: string) => {
      if (!currentUser) throw new ContentServiceError("Entre na sua conta para curtir.", 401);
      const comment = state.postComments.find((item) => item.id === commentId);
      if (!comment) throw new ContentServiceError("Comentário indisponível.", 404);
      assertReadable(comment.postId);
      if (isRemoteSocialSession) {
        const updated = await restSocialApi.setCommentLiked(
          commentId,
          !comment.isLiked,
        );
        dispatch({ type: "UPSERT_COMMENT", comment: updated });
        return;
      }
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
      if (isRemoteSocialSession) await restSocialApi.removePost(postId);
      dispatch({ type: "DELETE_POST", postId });
    },
    toggleBookmark: async (postId: string) => {
      const post = assertReadable(postId);
      if (isRemoteSocialSession) {
        const updated = await restSocialApi.setBookmarked(
          postId,
          !post.isBookmarked,
        );
        dispatch({ type: "UPSERT_POST", post: updated });
        return;
      }
      updateCurrentActivity((current) => ({
        ...current,
        bookmarkedPostIds: current.bookmarkedPostIds.includes(postId)
          ? current.bookmarkedPostIds.filter((id) => id !== postId)
          : [...current.bookmarkedPostIds, postId],
      }));
    },
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
