import { z } from "zod";

export const createBusinessProfileReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(500),
});

export const businessProfileReviewReplySchema = z.object({
  content: z.string().trim().min(3).max(500),
});
