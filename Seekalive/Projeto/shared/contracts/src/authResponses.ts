import { z } from "zod";

/**
 * Orval's generated Zod output includes the default 200 response, but not the
 * additional 202 response for login. Keep this schema aligned with
 * DeviceVerificationRequired in shared/api-spec/openapi.yaml.
 */
export const deviceVerificationRequiredResponseSchema = z.object({
  status: z.literal("device_verification_required"),
  challengeId: z.uuid(),
  emailMasked: z.string(),
  expiresAt: z.iso.datetime(),
  resendAvailableAt: z.iso.datetime(),
  message: z.string(),
});
