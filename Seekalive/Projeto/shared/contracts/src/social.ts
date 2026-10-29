import { z } from "zod";
import { usernameFormatSchema, usernameSchema } from "./username";

const commercialAccountPatchSchema = z
  .object({
    address: z.string().trim().min(5).max(250),
    postalCode: z.string().trim().min(5).max(20),
    cityName: z.string().trim().min(2).max(120),
    stateName: z.string().trim().min(2).max(100),
    countryName: z.string().trim().min(2).max(100),
  })
  .strict();

export const accountPatchSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().trim().min(2).max(100).optional(),
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    commercialProfile: commercialAccountPatchSchema.optional(),
    bio: z.string().trim().max(500).optional(),
    location: z.string().trim().max(160).nullable().optional(),
    website: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Use um endereço HTTP ou HTTPS.",
      )
      .nullable()
      .optional(),
    version: z.number().int().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).every((key) => key === "version")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "Informe ao menos um campo para atualizar.",
      });
    }
    if ((value.firstName === undefined) !== (value.lastName === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["firstName"],
        message: "Nome e sobrenome devem ser atualizados juntos.",
      });
    }
    if (
      value.firstName !== undefined &&
      value.lastName !== undefined &&
      `${value.firstName} ${value.lastName}`.length > 100
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastName"],
        message:
          "Nome e sobrenome juntos não podem ultrapassar 100 caracteres.",
      });
    }
    if (
      value.commercialProfile &&
      (value.firstName !== undefined || value.lastName !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["commercialProfile"],
        message: "Use apenas os campos correspondentes ao tipo da conta.",
      });
    }
  });

export const privacyWriteSchema = z
  .object({
    profileVisibility: z.enum(["public", "private"]),
    messages: z.enum(["everyone", "circle", "nobody"]),
    readReceipts: z.boolean(),
    version: z.number().int().min(1),
  })
  .strict();

export const accountIdParamSchema = z.object({
  accountId: z.string().uuid(),
});

export const profileUsernameParamSchema = z.object({
  username: usernameFormatSchema,
});

export type AccountPatchInput = z.infer<typeof accountPatchSchema>;
export type PrivacyWrite = z.infer<typeof privacyWriteSchema>;
