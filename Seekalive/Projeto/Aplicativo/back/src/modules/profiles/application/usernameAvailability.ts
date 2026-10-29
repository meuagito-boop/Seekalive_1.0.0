import type { UsernameClaimLookup } from "./ports";
import {
  isSeekaliveReservedUsername,
  usernameFormatSchema,
} from "@workspace/api-zod";

export type UsernameAvailabilityResult =
  | { kind: "invalid" }
  | { kind: "available" | "unavailable"; normalizedUsername: string };

export function createUsernameAvailabilityChecker(
  isUsernameClaimed: UsernameClaimLookup,
) {
  return async function checkUsernameAvailability(
    input: unknown,
  ): Promise<UsernameAvailabilityResult> {
    const candidate =
      typeof input === "string" ? input.trim().replace(/^@/, "") : "";
    const parsedUsername = usernameFormatSchema.safeParse(candidate);

    if (!parsedUsername.success) {
      return { kind: "invalid" };
    }

    const username = parsedUsername.data;
    if (isSeekaliveReservedUsername(username)) {
      return { kind: "unavailable", normalizedUsername: username };
    }

    const claimed = await isUsernameClaimed(username);
    return {
      kind: claimed ? "unavailable" : "available",
      normalizedUsername: username,
    };
  };
}

export type UsernameAvailabilityChecker = ReturnType<
  typeof createUsernameAvailabilityChecker
>;
