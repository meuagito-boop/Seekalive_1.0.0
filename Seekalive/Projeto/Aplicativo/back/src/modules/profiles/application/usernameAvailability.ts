import type { UsernameClaimLookup } from "./ports";

export type UsernameAvailabilityResult =
  | { kind: "invalid" }
  | { kind: "available" | "unavailable"; normalizedUsername: string };

export function createUsernameAvailabilityChecker(
  isUsernameClaimed: UsernameClaimLookup,
) {
  return async function checkUsernameAvailability(
    input: unknown,
  ): Promise<UsernameAvailabilityResult> {
    const username =
      typeof input === "string"
        ? input.trim().replace(/^@/, "").toLowerCase()
        : "";

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return { kind: "invalid" };
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
