import { z } from "zod";
import { postAudienceSchema } from "./audience";

const compatibilityAuthorId = z.string().uuid().optional();

export const createTextPostSchema = z.object({
  authorId: compatibilityAuthorId,
  content: z.string().trim().min(1).max(280),
  audience: postAudienceSchema,
  format: z.enum(["text", "media"]).optional(),
  mediaUrls: z.array(z.string().min(1).max(2048)).max(8).optional(),
  mediaTypes: z.array(z.enum(["image", "video"])).max(8).optional(),
}).strict().superRefine((value, context) => {
  if ((value.mediaUrls?.length ?? 0) !== (value.mediaTypes?.length ?? 0)) {
    context.addIssue({
      code: "custom",
      path: ["mediaTypes"],
      message: "Os tipos de mídia não correspondem aos arquivos.",
    });
  }
});

export type CreateTextPostInput = z.infer<typeof createTextPostSchema>;
