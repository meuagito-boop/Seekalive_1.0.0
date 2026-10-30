import type { ContentService } from "@/modules/social/services/contentService";
import type { PublishPostInput } from "@/modules/social/types/posts";
import { validatePublication } from "@/modules/social/application/contentValidation";
import { apiRequest, parsePost, parseComment } from "@/modules/social/services/socialHttp";

export const restContentAdapter: ContentService = {
  async createPost(input) {
    validatePublication(input);
    const path =
      input.format === "article"
        ? "/api/v1/social/articles"
        : "/api/v1/social/posts";
    return parsePost(await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(input),
      }));
  },
  async createComment(postId, content, authorId, replyToCommentId, idempotencyKey) {
    return parseComment(await apiRequest(
        `/api/v1/social/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            text: content,
            authorId,
            replyToCommentId: replyToCommentId ?? null,
            idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
          }),
        },
      ));
  },
};
