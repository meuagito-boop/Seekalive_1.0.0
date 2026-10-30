import type { RelationshipView } from "../../social/domain/relationshipView";
import type { AccountSocialSummary } from "../../social/application/getAccountSocialSummariesByIds";
import type { AccountSocialStats } from "../../social/application/getAccountSocialStats";
import type { AccountIdentityRecord } from "../../accounts/domain/accountIdentity";
import type {
  ProfilePresentationRecord,
  PublicProfileRecord,
} from "../domain/publicProfileRecord";
import { buildProfileView } from "./profileViewMapper";

export interface AccountIdentityReader {
  findActiveAccountById(id: string): Promise<AccountIdentityRecord | null>;
  findActiveAccountByUsername(
    username: string,
  ): Promise<AccountIdentityRecord | null>;
  findActiveAccountsByIds(ids: string[]): Promise<AccountIdentityRecord[]>;
}

export interface ProfilePresentationReader {
  findByAccountId(accountId: string): Promise<ProfilePresentationRecord | null>;
  findByAccountIds(
    accountIds: string[],
  ): Promise<Map<string, ProfilePresentationRecord>>;
}

export interface ProfileSocialViewReader {
  getRelationshipFor(
    viewerId: string | null,
    targetId: string,
  ): Promise<RelationshipView>;
  getAccountSocialStats(
    accountId: string,
  ): Promise<AccountSocialStats>;
  getAccountSocialSummariesByIds(
    accountIds: string[],
    viewerId: string | null,
    options?: { includeBlocked?: boolean },
  ): Promise<Map<string, AccountSocialSummary>>;
}

export function createProfileViews(
  accounts: AccountIdentityReader,
  profiles: ProfilePresentationReader,
  social: ProfileSocialViewReader,
) {
  return {
    async findActiveAccountById(id: string) {
      const identity = await accounts.findActiveAccountById(id);
      if (!identity) return null;
      const profile = await profiles.findByAccountId(id);
      if (!profile) {
        throw new Error(`Active account ${id} has no canonical profile record.`);
      }
      return { ...identity, isPrivate: profile.isPrivate };
    },
    findActiveAccountByUsername: (username: string) =>
      accounts.findActiveAccountByUsername(username),

    async accountView(
      identity: AccountIdentityRecord,
      viewerId: string | null,
      knownRelationship?: RelationshipView,
    ) {
      const profile = await profiles.findByAccountId(identity.id);
      if (!profile) {
        throw new Error(
          `Active account ${identity.id} has no canonical profile record.`,
        );
      }
      const [relationship, stats] = await Promise.all([
        knownRelationship
          ? Promise.resolve(knownRelationship)
          : social.getRelationshipFor(viewerId, identity.id),
        social.getAccountSocialStats(identity.id),
      ]);
      const row: PublicProfileRecord = { ...identity, ...profile };
      return buildProfileView(row, viewerId, relationship, stats);
    },

    async accountViewsByIds(
      ids: string[],
      viewerId: string | null,
      options: { includeBlocked?: boolean } = {},
    ) {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return [];

      const identities = await accounts.findActiveAccountsByIds(uniqueIds);
      if (identities.length === 0) return [];

      const [profileRecords, socialSummaries] = await Promise.all([
        profiles.findByAccountIds(identities.map(({ id }) => id)),
        social.getAccountSocialSummariesByIds(
          identities.map(({ id }) => id),
          viewerId,
          options,
        ),
      ]);

      const byId = new Map<string, ReturnType<typeof buildProfileView>>();
      for (const identity of identities) {
        const profile = profileRecords.get(identity.id);
        if (!profile) {
          throw new Error(
            `Active account ${identity.id} has no canonical profile record.`,
          );
        }
        const summary = socialSummaries.get(identity.id);
        if (!summary) continue;
        byId.set(
          identity.id,
          buildProfileView(
            { ...identity, ...profile },
            viewerId,
            summary.relationship,
            summary.stats,
          ),
        );
      }
      return ids.map((id) => byId.get(id)).filter((view) => view !== undefined);
    },
  };
}
