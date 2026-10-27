import {
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
  getRelationshipFor,
} from "../../social/composition/publicApi";
import type { RelationshipView } from "../../social/domain/relationshipView";
import {
  findActiveAccountById,
  findActiveAccountByUsername,
  findActiveAccountsByIds,
} from "../infrastructure/accountReadRepository";
import type { PublicAccountRow } from "../domain/publicAccount";
import { buildAccountView } from "./accountViewMapper";

export type { PublicAccountRow } from "../domain/publicAccount";
export { findActiveAccountById, findActiveAccountByUsername };

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

export async function accountViewsByIds(
  ids: string[],
  viewerId: string | null,
  options: { includeBlocked?: boolean } = {},
) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const rows = await findActiveAccountsByIds(uniqueIds);
  if (rows.length === 0) return [];

  const socialSummaries = await getAccountSocialSummariesByIds(
    rows.map((row) => row.id),
    viewerId,
    options,
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
