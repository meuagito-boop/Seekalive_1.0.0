import type { PublicAccountRow } from "../domain/publicAccount";
import type { RelationshipView } from "../../social/domain/relationshipView";
import type { AccountReadPort, AccountSocialViewPort } from "./ports";
import { buildAccountView } from "./accountViewMapper";

export type { PublicAccountRow } from "../domain/publicAccount";

export function createAccountViews(
  accountReads: AccountReadPort,
  social: AccountSocialViewPort,
) {
  return {
    findActiveAccountById: (id: string) => accountReads.findActiveAccountById(id),
    findActiveAccountByUsername: (username: string) =>
      accountReads.findActiveAccountByUsername(username),

    async accountView(
      row: PublicAccountRow,
      viewerId: string | null,
      knownRelationship?: RelationshipView,
    ) {
      const [relationship, stats] = await Promise.all([
        knownRelationship
          ? Promise.resolve(knownRelationship)
          : social.getRelationshipFor(viewerId, row.id),
        social.getAccountSocialStats(row.id),
      ]);
      return buildAccountView(row, viewerId, relationship, stats);
    },

    async accountViewsByIds(
      ids: string[],
      viewerId: string | null,
      options: { includeBlocked?: boolean } = {},
    ) {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return [];

      const rows = await accountReads.findActiveAccountsByIds(uniqueIds);
      if (rows.length === 0) return [];

      const socialSummaries = await social.getAccountSocialSummariesByIds(
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
    },
  };
}
