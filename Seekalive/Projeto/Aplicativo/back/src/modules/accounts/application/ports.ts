import type { AccountSocialSummary } from "../../social/application/getAccountSocialSummariesByIds";
import type { AccountSocialStats } from "../../social/application/getAccountSocialStats";
import type { RelationshipView } from "../../social/domain/relationshipView";
import type { PublicAccountRow } from "../domain/publicAccount";

export interface AccountReadPort {
  findActiveAccountById(id: string): Promise<PublicAccountRow | null>;
  findActiveAccountByUsername(username: string): Promise<PublicAccountRow | null>;
  findActiveAccountsByIds(ids: string[]): Promise<PublicAccountRow[]>;
}

export interface AccountSocialViewPort {
  getRelationshipFor(viewerId: string | null, targetId: string): Promise<RelationshipView>;
  getAccountSocialStats(accountId: string): Promise<AccountSocialStats>;
  getAccountSocialSummariesByIds(
    accountIds: string[],
    viewerId: string | null,
    options?: { includeBlocked?: boolean },
  ): Promise<Map<string, AccountSocialSummary>>;
}
