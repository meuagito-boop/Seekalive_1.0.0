import { z } from "zod";

export const referenceSchema = z.object({
  type: z.enum(["seek_entity", "shop_item", "social_post"]),
  id: z.string().trim().min(1).max(200),
});
