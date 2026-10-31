import type { ContentService } from "@/modules/social/services/contentService";
import type { PublishPostInput } from "@/modules/social/types/posts";
import { validatePublication } from "@/modules/social/application/contentValidation";
import { apiRequest, parsePost, parseComment } from "@/modules/social/services/socialHttp";
import {
  discardStagedSocialMedia,
  uploadSocialMedia,
} from "@/modules/social/services/restMediaApi";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";

export const restContentAdapter: ContentService = {
  async createPost(input) {
    const validated = validatePublication(input);
    if (validated.reference && validated.reference.type !== "social_post") {
      throw new ContentServiceError(
        "Nesta etapa, só é possível anexar outra publicação Social.",
        422,
      );
    }
    const files = input.mediaFiles ?? [];
    const types = input.mediaTypes ?? [];
    if (files.length !== types.length || files.length > 8) {
      throw new ContentServiceError(
        "As mídias selecionadas não correspondem aos arquivos do rascunho. Selecione-as novamente.",
        422,
      );
    }

    const uploadedMedia: Awaited<ReturnType<typeof uploadSocialMedia>>[] = [];
    try {
      for (const [index, file] of files.entries()) {
        uploadedMedia.push(await uploadSocialMedia(file, types[index]));
      }
      const {
        mediaUrls: _previewUrls,
        mediaTypes: _previewTypes,
        ...postPayload
      } = validated;
      const path =
        validated.format === "article"
          ? "/api/v1/social/articles"
          : "/api/v1/social/posts";
      return parsePost(await apiRequest(path, {
        method: "POST",
        body: JSON.stringify({
          ...postPayload,
          ...(uploadedMedia.length > 0
            ? { mediaAssetIds: uploadedMedia.map((media) => media.id) }
            : {}),
        }),
      }));
    } catch (error) {
      await Promise.allSettled(
        uploadedMedia.map((media) => discardStagedSocialMedia(media.id)),
      );
      throw error;
    }
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
