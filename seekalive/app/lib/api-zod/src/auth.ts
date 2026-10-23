import { z } from "zod";

const sharedRegistrationFields = {
  username: z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  passwordConfirmation: z.string().min(8).max(128),
  acceptedTermsVersion: z.string().trim().min(1).max(50),
  age: z.coerce.number().int().min(1).max(120),
};

const personalRegistrationSchema = z.object({
  accountType: z.literal("personal"),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  ...sharedRegistrationFields,
});

const commercialRegistrationSchema = z.object({
  accountType: z.literal("commercial"),
  businessName: z.string().trim().min(2).max(100),
  categoryKey: z.enum(["restaurantes", "bares", "cafes", "servicos", "compras", "saude", "lazer"]),
  discoveryKind: z.enum(["place", "provider"]),
  address: z.string().trim().min(3).max(250),
  postalCode: z.string().trim().min(5).max(20),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100),
  ...sharedRegistrationFields,
});

export const registerRequestSchema = z
  .discriminatedUnion("accountType", [personalRegistrationSchema, commercialRegistrationSchema])
  .superRefine((value, context) => {
    if (value.password !== value.passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "As senhas não coincidem.",
      });
    }
  });

export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(128),
});

export const verificationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const verificationConfirmSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().regex(/^[0-9]{6}$/),
});

export const onboardingCompletionSchema = z
  .object({
    interests: z.array(z.string().trim().min(1).max(80)).max(100),
    skipped: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.skipped && value.interests.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interests"],
        message: "Interesses não devem ser enviados quando esta etapa for pulada.",
      });
    }
    if (new Set(value.interests).size !== value.interests.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interests"],
        message: "Remova interesses repetidos.",
      });
    }
  });

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
