import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(20)
  .regex(/^[a-z0-9_]+$/);
