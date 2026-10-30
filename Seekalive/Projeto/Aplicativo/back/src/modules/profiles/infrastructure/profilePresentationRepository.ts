import { inArray, eq } from "drizzle-orm";
import { accountProfiles, db } from "@workspace/db";
import type { ProfilePresentationRecord } from "../domain/publicProfileRecord";

const profilePresentationSelection = {
  accountId: accountProfiles.accountId,
  firstName: accountProfiles.firstName,
  lastName: accountProfiles.lastName,
  displayName: accountProfiles.displayName,
  bio: accountProfiles.bio,
  locationLabel: accountProfiles.locationLabel,
  websiteUrl: accountProfiles.websiteUrl,
  isPrivate: accountProfiles.isPrivate,
};

export async function findProfilePresentationByAccountId(
  accountId: string,
): Promise<ProfilePresentationRecord | null> {
  const [profile] = await db
    .select(profilePresentationSelection)
    .from(accountProfiles)
    .where(eq(accountProfiles.accountId, accountId))
    .limit(1);
  return profile ?? null;
}

export async function findProfilePresentationsByAccountIds(
  accountIds: string[],
): Promise<Map<string, ProfilePresentationRecord>> {
  if (accountIds.length === 0) return new Map();
  const rows = await db
    .select(profilePresentationSelection)
    .from(accountProfiles)
    .where(inArray(accountProfiles.accountId, accountIds));
  return new Map(rows.map((row) => [row.accountId, row]));
}
