import { z } from "zod";
import { passwordPolicySchema } from "@workspace/api-zod";

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(3, "Informe seu nome de usuário ou e-mail"),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres")
    .max(128, "A senha deve ter no máximo 128 caracteres"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const passwordPolicyUpdateSchema = z
  .object({
    newPassword: passwordPolicySchema,
    passwordConfirmation: passwordPolicySchema,
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "As senhas não coincidem.",
      });
    }
  });

export type PasswordUpdateFormValues = z.infer<
  typeof passwordPolicyUpdateSchema
>;
