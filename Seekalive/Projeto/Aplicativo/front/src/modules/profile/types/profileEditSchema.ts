import { z } from "zod";
import { usernameSchema } from "@workspace/api-zod";

export const profileEditSchema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  displayName: z.string().trim().max(100),
  username: usernameSchema,
  bio: z.string().max(160),
  location: z.string().max(50).optional(),
  website: z
    .string()
    .url("URL inválida")
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "Use um endereço HTTP ou HTTPS.",
    )
    .optional()
    .or(z.literal("")),
  businessAddress: z.string().max(120).optional(),
  priceLevel: z.string().regex(/^$|^[1-4]$/),
  serviceDelivery: z.enum(["unknown", "yes", "no"]),
  serviceDineIn: z.enum(["unknown", "yes", "no"]),
  serviceTableService: z.enum(["unknown", "yes", "no"]),
  serviceReservations: z.enum(["unknown", "yes", "no"]),
  serviceAppointments: z.enum(["unknown", "yes", "no"]),
  serviceTakeout: z.enum(["unknown", "yes", "no"]),
});

export type ProfileEditFormValues = z.infer<typeof profileEditSchema>;
export type ServiceStatus = "unknown" | "yes" | "no";

export const serviceFields = [
  { name: "serviceDelivery", label: "Delivery" },
  { name: "serviceDineIn", label: "Atendimento no local" },
  { name: "serviceTableService", label: "Atendimento à mesa" },
  { name: "serviceReservations", label: "Reservas" },
  { name: "serviceAppointments", label: "Agendamento" },
  { name: "serviceTakeout", label: "Retirada no local" },
] as const;

export function serviceStatus(value?: boolean): ServiceStatus {
  return value === undefined ? "unknown" : value ? "yes" : "no";
}

export function serviceValue(value: ServiceStatus): boolean | undefined {
  return value === "unknown" ? undefined : value === "yes";
}
