import { z } from "zod";
import { passwordPolicySchema } from "@workspace/api-zod";

export const registrationFormSchema = z
  .object({
    accountType: z.enum(["personal", "commercial"]),
    firstName: z.string(),
    lastName: z.string(),
    businessName: z.string(),
    age: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, "Informe uma idade válida")
      .refine(
        (value) => Number(value) >= 18 && Number(value) <= 120,
        "O cadastro está disponível para pessoas com 18 anos ou mais",
      ),
    businessCategory: z.string(),
    discoveryKind: z.enum(["place", "provider"]),
    address: z.string(),
    postalCode: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    username: z
      .string()
      .trim()
      .min(3, "O nome de usuário deve ter ao menos 3 caracteres")
      .max(20, "O nome de usuário deve ter no máximo 20 caracteres")
      .regex(/^[a-z0-9_]+$/, "Use letras minúsculas, números e _"),
    email: z
      .string()
      .trim()
      .email("E-mail inválido")
      .max(254, "O e-mail é muito longo"),
    password: passwordPolicySchema,
    confirmPassword: passwordPolicySchema,
    terms: z
      .boolean()
      .refine((value) => value, "Aceite os termos para continuar"),
  })
  .superRefine((data, context) => {
    if (data.accountType === "personal") {
      if (data.firstName.trim().length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe seu nome",
          path: ["firstName"],
        });
      }
      if (data.lastName.trim().length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe seu sobrenome",
          path: ["lastName"],
        });
      }
    } else if (data.businessName.trim().length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o nome da empresa ou do prestador",
        path: ["businessName"],
      });
    }

    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Senhas não coincidem",
        path: ["confirmPassword"],
      });
    }

    if (data.accountType === "commercial" && !data.businessCategory) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione a categoria do perfil comercial",
        path: ["businessCategory"],
      });
    }

    if (data.accountType === "commercial") {
      const requiredBusinessFields = [
        ["address", "Informe o endereço", 3],
        ["postalCode", "Informe o CEP", 5],
        ["city", "Informe a cidade", 2],
        ["state", "Informe o estado", 2],
        ["country", "Informe o país", 2],
      ] as const;

      for (const [field, message, min] of requiredBusinessFields) {
        if (data[field].trim().length < min) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: [field],
          });
        }
      }
    }
  });

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;
