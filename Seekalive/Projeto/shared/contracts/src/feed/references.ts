import { z } from "zod";

export const socialPostReferenceSchema = z.object({
  type: z.literal("social_post"),
  id: z.string().uuid(),
}).strict();

export type SocialPostReference = z.infer<typeof socialPostReferenceSchema>;
