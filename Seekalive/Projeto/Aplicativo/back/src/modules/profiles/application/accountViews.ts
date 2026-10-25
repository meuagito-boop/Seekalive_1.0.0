import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import {
  getAccountSocialStats,
  type AccountSocialStats,
} from "../../social/application/getAccountSocialStats";
import { getAccountSocialSummariesByIds } from "../../social/application/getAccountSocialSummariesByIds";
import { getRelationshipFor } from "../../social/application/getRelationshipFor";
import type { RelationshipView } from "../../social/application/relationshipView";
import { canViewPrivateProfileContent } from "./profileVisibility";

export type PublicAccountRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  locationLabel: string | null;
  websiteUrl: string | null;
  accountType: string;
  isPrivate: boolean;
  createdAt: Date;
  version: number;
};

export async function findActiveAccountById(id: string): Promise<PublicAccountRow | null> {
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.id, id),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

export async function findActiveAccountByUsername(username: string): Promise<PublicAccountRow | null> {
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.username, username),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

function buildAccountView(
  row: PublicAccountRow,
  viewerId: string | null,
  relationship: RelationshipView,
  stats: AccountSocialStats,
) {
  const privateDetailsVisible = canViewPrivateProfileContent(
    row.isPrivate,
    viewerId,
    row.id,
    relationship.following,
  );
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: privateDetailsVisible ? row.bio : "",
    avatarUrl: null,
    coverUrl: null,
    location: privateDetailsVisible ? row.locationLabel : null,
    website: privateDetailsVisible ? row.websiteUrl : null,
    accountType: row.accountType,
    isPrivate: row.isPrivate,
    joinedAt: row.createdAt.toISOString(),
    relationship,
    stats,
    version: row.version,
  };
}

export async function accountView(
  row: PublicAccountRow,
  viewerId: string | null,
  knownRelationship?: RelationshipView,
) {
  const [relationship, stats] = await Promise.all([
    knownRelationship ? Promise.resolve(knownRelationship) : getRelationshipFor(viewerId, row.id),
    getAccountSocialStats(row.id),
  ]);
  return buildAccountView(row, viewerId, relationship, stats);
}

export async function accountViewsByIds(ids: string[], viewerId: string | null) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const rows = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      inArray(accounts.id, uniqueIds),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ));
  if (rows.length === 0) return [];

  const socialSummaries = await getAccountSocialSummariesByIds(
    rows.map((row) => row.id),
    viewerId,
  );
  const byId = new Map<string, ReturnType<typeof buildAccountView>>();
  for (const row of rows) {
    const summary = socialSummaries.get(row.id);
    if (!summary) continue;
    byId.set(
      row.id,
      buildAccountView(row, viewerId, summary.relationship, summary.stats),
    );
  }
  return ids.map((id) => byId.get(id)).filter((account) => account !== undefined);
}
