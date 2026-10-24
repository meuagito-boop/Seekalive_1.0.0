import { z } from "zod";

const usernameSchema = z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/);

export const accountPatchSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  location: z.string().trim().max(160).nullable().optional(),
  website: z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Use um endereço HTTP ou HTTPS.").nullable().optional(),
  version: z.number().int().min(1),
}).strict().superRefine((value, context) => {
  if (Object.keys(value).every((key) => key === "version")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: [], message: "Informe ao menos um campo para atualizar." });
  }
});

export const privacyWriteSchema = z.object({
  profileVisibility: z.enum(["public", "private"]),
  messages: z.enum(["everyone", "circle", "nobody"]),
  readReceipts: z.boolean(),
  version: z.number().int().min(1),
}).strict();

export const accountIdParamSchema = z.object({
  accountId: z.string().uuid(),
});

export const profileUsernameParamSchema = z.object({
  username: usernameSchema,
});

export type AccountPatchInput = z.infer<typeof accountPatchSchema>;
export type PrivacyWrite = z.infer<typeof privacyWriteSchema>;
