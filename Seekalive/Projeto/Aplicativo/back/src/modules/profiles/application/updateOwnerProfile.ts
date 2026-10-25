import { and, eq, gt, lte, sql } from "drizzle-orm";
import type { AccountPatchInput } from "@workspace/api-zod";
import {
  accountUsernameReservations,
  accounts,
  commercialProfiles,
  db,
} from "@workspace/db";
import {
  lockUsernameClaims,
  nextIdentityChangeAt,
  USERNAME_RESERVATION_MS,
} from "../../accounts/application/usernamePolicy";
import { prepareCommercialProfileUpdate } from "./commercialProfileUpdate";
import { preparePersonalProfileUpdate } from "./personalProfileUpdate";
import type { ProfileUpdateOwner } from "./profileUpdateTypes";

export type ProfileUpdateResult =
  | { kind: "updated" }
  | { kind: "account_not_found" | "account_type_invalid" | "version_conflict" | "account_field_not_allowed"
      | "account_name_mismatch" | "username_unavailable" | "commercial_profile_missing" }
  | { kind: "name_change_cooldown" | "username_change_cooldown"; availableAt: Date };

function databaseErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return undefined;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

function isProfileAccountType(value: string): value is ProfileUpdateOwner["accountType"] {
  return value === "personal" || value === "commercial";
}

export async function updateOwnerProfile(
  accountId: string,
  patch: AccountPatchInput,
): Promise<ProfileUpdateResult> {
  try {
    return await db.transaction(async (tx): Promise<ProfileUpdateResult> => {
      const [owner] = await tx
        .select({
          accountType: accounts.accountType,
          username: accounts.username,
          firstName: accounts.firstName,
          lastName: accounts.lastName,
          displayName: accounts.displayName,
          createdAt: accounts.createdAt,
          publicNameChangedAt: accounts.publicNameChangedAt,
          usernameChangedAt: accounts.usernameChangedAt,
          version: accounts.version,
        })
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.status, "active")))
        .for("update")
        .limit(1);
      if (!owner) return { kind: "account_not_found" };
      if (owner.version !== patch.version) return { kind: "version_conflict" };
      if (!isProfileAccountType(owner.accountType)) {
        return { kind: "account_type_invalid" };
      }
      const profileOwner: ProfileUpdateOwner = { ...owner, accountType: owner.accountType };

      const profileChanges = profileOwner.accountType === "personal"
        ? preparePersonalProfileUpdate(profileOwner, patch)
        : prepareCommercialProfileUpdate(profileOwner, patch);
      if (!profileChanges.ok) return { kind: profileChanges.kind };

      const usernameChanged = patch.username !== undefined && patch.username !== owner.username;
      const now = new Date();
      const publicNameAvailableAt = nextIdentityChangeAt(owner.publicNameChangedAt, owner.createdAt);
      const usernameAvailableAt = nextIdentityChangeAt(owner.usernameChangedAt, owner.createdAt);

      if (profileChanges.changes.publicNameChanged && now < publicNameAvailableAt) {
        return { kind: "name_change_cooldown", availableAt: publicNameAvailableAt };
      }
      if (usernameChanged && now < usernameAvailableAt) {
        return { kind: "username_change_cooldown", availableAt: usernameAvailableAt };
      }

      if (owner.accountType === "commercial" && patch.commercialProfile) {
        const [commercialProfile] = await tx
          .select({ accountId: commercialProfiles.accountId })
          .from(commercialProfiles)
          .where(eq(commercialProfiles.accountId, accountId))
          .limit(1);
        if (!commercialProfile) return { kind: "commercial_profile_missing" };
      }

      if (usernameChanged && patch.username) {
        await lockUsernameClaims(tx, [owner.username, patch.username]);
        await tx
          .delete(accountUsernameReservations)
          .where(and(
            eq(accountUsernameReservations.username, patch.username),
            lte(accountUsernameReservations.reservedUntil, now),
          ));
        const [claimedAccount] = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.username, patch.username))
          .limit(1);
        const [activeReservation] = await tx
          .select({ username: accountUsernameReservations.username })
          .from(accountUsernameReservations)
          .where(and(
            eq(accountUsernameReservations.username, patch.username),
            gt(accountUsernameReservations.reservedUntil, now),
          ))
          .limit(1);
        if (claimedAccount || activeReservation) return { kind: "username_unavailable" };

        await tx.insert(accountUsernameReservations).values({
          username: owner.username,
          accountId,
          reservedUntil: new Date(now.getTime() + USERNAME_RESERVATION_MS),
        });
      }

      const [updated] = await tx
        .update(accounts)
        .set({
          ...(usernameChanged && patch.username
            ? { username: patch.username, usernameChangedAt: now }
            : {}),
          ...profileChanges.changes.accountFields,
          ...(profileChanges.changes.publicNameChanged ? { publicNameChangedAt: now } : {}),
          ...(patch.bio === undefined ? {} : { bio: patch.bio }),
          ...(patch.location === undefined ? {} : { locationLabel: patch.location }),
          ...(patch.website === undefined ? {} : { websiteUrl: patch.website }),
          ...(owner.accountType === "commercial" && patch.commercialProfile
            ? { locationLabel: `${patch.commercialProfile.cityName}, ${patch.commercialProfile.stateName}` }
            : {}),
          updatedAt: new Date(),
          version: sql`${accounts.version} + 1`,
        })
        .where(and(
          eq(accounts.id, accountId),
          eq(accounts.version, patch.version),
          eq(accounts.accountType, owner.accountType),
          eq(accounts.status, "active"),
        ))
        .returning({ id: accounts.id });
      if (!updated) return { kind: "version_conflict" };

      if (owner.accountType === "commercial" && patch.commercialProfile) {
        await tx
          .update(commercialProfiles)
          .set({ ...patch.commercialProfile, updatedAt: new Date() })
          .where(eq(commercialProfiles.accountId, accountId));
      }
      return { kind: "updated" };
    });
  } catch (error) {
    const constraint = error && typeof error === "object"
      ? (error as { constraint?: unknown }).constraint
      : undefined;
    if (
      databaseErrorCode(error) === "23505"
      && ["accounts_username_unique", "account_username_reservations_pkey"].includes(
        typeof constraint === "string" ? constraint : "",
      )
    ) {
      return { kind: "username_unavailable" };
    }
    throw error;
  }
}
