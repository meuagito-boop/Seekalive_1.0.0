import { z } from "zod";
import { postAudienceSchema } from "./audience";

const compatibilityAuthorId = z.string().uuid().optional();

export const createArticleSchema = z.object({
  authorId: compatibilityAuthorId,
  content: z.string().trim().max(280).default(""),
  audience: postAudienceSchema,
  format: z.literal("article").optional(),
  article: z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(50_000),
  }).strict(),
}).strict();

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
