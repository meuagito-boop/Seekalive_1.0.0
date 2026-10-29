import { z } from "zod";

/**
 * Orval's generated Zod output omits the login 202 union. Keep both branches
 * aligned with the login response contract in shared/api-spec/openapi.yaml.
 */
const deviceVerificationRequiredSchema = z.object({
  status: z.literal("device_verification_required"),
  challengeId: z.uuid(),
  emailMasked: z.string(),
  expiresAt: z.iso.datetime(),
  resendAvailableAt: z.iso.datetime(),
  message: z.string(),
});

const accountDeletionPendingResponseSchema = z.object({
  status: z.literal("account_deletion_pending"),
  deletionScheduledFor: z.iso.datetime(),
  emailMasked: z.string(),
  message: z.string(),
});

export const loginStepUpResponseSchema = z.discriminatedUnion("status", [
  deviceVerificationRequiredSchema,
  accountDeletionPendingResponseSchema,
]);
