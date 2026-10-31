import { z } from "zod";
import { postAudienceSchema } from "./audience";

const compatibilityAuthorId = z.string().uuid().optional();

export const createTextPostSchema = z.object({
  authorId: compatibilityAuthorId,
  content: z.string().trim().max(280),
  audience: postAudienceSchema,
  format: z.enum(["text", "media"]).optional(),
  mediaAssetIds: z.array(z.string().uuid()).max(8).optional(),
}).strict().superRefine((value, context) => {
  const hasMedia = (value.mediaAssetIds?.length ?? 0) > 0;
  if (!value.content && !hasMedia) {
    context.addIssue({
      code: "custom",
      path: ["content"],
      message: "Escreva uma legenda ou adicione uma mídia.",
    });
  }
  if ((value.format === "media") !== hasMedia) {
    context.addIssue({
      code: "custom",
      path: ["mediaAssetIds"],
      message: "O formato da publicação deve corresponder às mídias anexadas.",
    });
  }
});

export type CreateTextPostInput = z.infer<typeof createTextPostSchema>;
