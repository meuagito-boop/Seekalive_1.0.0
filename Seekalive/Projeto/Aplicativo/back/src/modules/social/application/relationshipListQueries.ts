import type { AccountListQueryPort, AccountViewLookupPort } from "./ports";

export type RelationshipListPage = { limit: number; offset: number };

export type RelationshipListOperations<TAccount extends { id: string }> = {
  searchAccountViews(
    query: string,
    viewerId: string,
    page: RelationshipListPage,
  ): Promise<{ items: TAccount[]; nextCursor: string | null }>;
  followerAccountViews(
    accountId: string,
    viewerId: string | null,
    page: RelationshipListPage,
  ): Promise<TAccount[]>;
  followingAccountViews(
    accountId: string,
    viewerId: string | null,
    page: RelationshipListPage,
  ): Promise<TAccount[]>;
  circleAccountViews(
    accountId: string,
    page: RelationshipListPage,
  ): Promise<{ account: TAccount; isMutual: true }[]>;
  incomingFollowRequestViews(
    accountId: string,
    page: RelationshipListPage,
  ): Promise<{
    items: { account: TAccount; createdAt: string }[];
    hasMore: boolean;
  }>;
  blockedAccountViews(accountId: string): Promise<TAccount[]>;
};

export function createRelationshipListQueries<TAccount extends { id: string }>(
  lists: AccountListQueryPort,
  accountViewsByIds: AccountViewLookupPort<TAccount>,
): RelationshipListOperations<TAccount> {
  return {
    async searchAccountViews(
      query: string,
      viewerId: string,
      page: RelationshipListPage,
    ) {
      const rows = await lists.searchVerifiedAccountIds(
        query,
        page.limit,
        page.offset,
      );
      const pageRows = rows.slice(0, page.limit);
      const accountsById = new Map(
        (
          await accountViewsByIds(
            pageRows.map((row) => row.id),
            viewerId,
          )
        ).map((account) => [account.id, account]),
      );
      const items = pageRows.flatMap((row) => {
        const account = accountsById.get(row.id);
        return account ? [account] : [];
      });
      return {
        items,
        nextCursor:
          rows.length > page.limit
            ? Buffer.from(String(page.offset + page.limit)).toString(
                "base64url",
              )
            : null,
      };
    },

    async followerAccountViews(
      accountId: string,
      viewerId: string | null,
      page: RelationshipListPage,
    ) {
      const rows = await lists.listFollowerIds(
        accountId,
        page.limit,
        page.offset,
      );
      return accountViewsByIds(
        rows.map((row) => row.id),
        viewerId,
      );
    },

    async followingAccountViews(
      accountId: string,
      viewerId: string | null,
      page: RelationshipListPage,
    ) {
      const rows = await lists.listFollowingIds(
        accountId,
        page.limit,
        page.offset,
      );
      return accountViewsByIds(
        rows.map((row) => row.id),
        viewerId,
      );
    },

    async circleAccountViews(accountId: string, page: RelationshipListPage) {
      const rows = await lists.listCircleIds(
        accountId,
        page.limit,
        page.offset,
      );
      const accounts = await accountViewsByIds(
        rows.map((row) => row.id),
        accountId,
      );
      return accounts.map((account) => ({ account, isMutual: true }));
    },

    async incomingFollowRequestViews(
      accountId: string,
      page: RelationshipListPage,
    ) {
      const rows = await lists.listIncomingFollowRequests(
        accountId,
        page.limit,
        page.offset,
      );
      const pageRows = rows.slice(0, page.limit + 1);
      const accountsById = new Map(
        (
          await accountViewsByIds(
            pageRows.map((row) => row.id),
            accountId,
          )
        ).map((account) => [account.id, account]),
      );
      return {
        items: pageRows.flatMap((row) => {
          const account = accountsById.get(row.id);
          return account
            ? [{ account, createdAt: row.createdAt.toISOString() }]
            : [];
        }),
        hasMore: rows.length > page.limit,
      };
    },

    async blockedAccountViews(accountId: string) {
      const rows = await lists.listBlockedAccountIds(accountId);
      return accountViewsByIds(
        rows.map((row) => row.id),
        accountId,
        { includeBlocked: true },
      );
    },
  };
}
