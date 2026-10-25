import { z } from "zod";

export const postAudienceSchema = z.enum(["public", "circles", "private"]);
export type PostAudience = z.infer<typeof postAudienceSchema>;
