import type { ContentService } from "@/modules/social/services/contentService";
import type { PublishPostInput } from "@/modules/social/types/posts";
import { validatePublication } from "@/modules/social/application/contentValidation";
import {
  apiRequest,
  parseResponse,
  postSchema,
  commentSchema,
} from "@/modules/social/services/socialHttp";

// Not wired into the app. Post/article writes exist; comment creation does not.
export const restContentAdapter: ContentService = {
  async createPost(input) {
    validatePublication(input);
    const path =
      input.format === "article"
        ? "/api/v1/social/articles"
        : "/api/v1/social/posts";
    return parseResponse(
      postSchema,
      await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },
  async createComment(postId, content, authorId, replyToCommentId) {
    return parseResponse(
      commentSchema,
      await apiRequest(
        `/api/v1/social/posts/${encodeURIComponent(postId)}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            text: content,
            authorId,
            replyToCommentId: replyToCommentId ?? null,
          }),
        },
      ),
    );
  },
};
