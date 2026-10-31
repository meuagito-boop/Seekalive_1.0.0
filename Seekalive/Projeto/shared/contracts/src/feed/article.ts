import { z } from "zod";
import { postAudienceSchema } from "./audience";
import {
  countPostHashtags,
  HASHTAG_LIMIT_MESSAGE,
  MAX_HASHTAGS_PER_POST,
} from "./hashtags";

const compatibilityAuthorId = z.string().uuid().optional();

export const createArticleSchema = z.object({
  authorId: compatibilityAuthorId,
  content: z.string().trim().max(280).default(""),
  audience: postAudienceSchema,
  format: z.literal("article").optional(),
  mediaAssetIds: z.array(z.string().uuid()).max(8).optional(),
  article: z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(50_000),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (
    countPostHashtags(
      value.content,
      value.article.title,
      value.article.body,
    ) > MAX_HASHTAGS_PER_POST
  ) {
    context.addIssue({
      code: "custom",
      path: ["article", "body"],
      message: HASHTAG_LIMIT_MESSAGE,
    });
  }
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
