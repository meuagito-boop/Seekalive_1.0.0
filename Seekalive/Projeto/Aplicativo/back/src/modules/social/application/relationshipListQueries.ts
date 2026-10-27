import { accountViewsByIds } from "../../accounts/application/accountViews";
import {
  listBlockedAccountIds,
  listCircleIds,
  listFollowerIds,
  listFollowingIds,
  listIncomingFollowRequests,
  searchVerifiedAccountIds,
} from "../infrastructure/socialAccountListRepository";

type Page = { limit: number; offset: number };

export async function searchAccountViews(
  query: string,
  viewerId: string,
  page: Page,
) {
  const rows = await searchVerifiedAccountIds(query, page.limit, page.offset);
  const pageRows = rows.slice(0, page.limit);
  const accountsById = new Map(
    (await accountViewsByIds(pageRows.map((row) => row.id), viewerId))
      .map((account) => [account.id, account]),
  );
  const items = pageRows.flatMap((row) => {
    const account = accountsById.get(row.id);
    return account ? [account] : [];
  });
  return {
    items,
    nextCursor: rows.length > page.limit
      ? Buffer.from(String(page.offset + page.limit)).toString("base64url")
      : null,
  };
}

export async function followerAccountViews(accountId: string, viewerId: string | null, page: Page) {
  const rows = await listFollowerIds(accountId, page.limit, page.offset);
  return accountViewsByIds(rows.map((row) => row.id), viewerId);
}

export async function followingAccountViews(accountId: string, viewerId: string | null, page: Page) {
  const rows = await listFollowingIds(accountId, page.limit, page.offset);
  return accountViewsByIds(rows.map((row) => row.id), viewerId);
}

export async function circleAccountViews(accountId: string, page: Page) {
  const rows = await listCircleIds(accountId, page.limit, page.offset);
  const accounts = await accountViewsByIds(rows.map((row) => row.id), accountId);
  return accounts.map((account) => ({ account, isMutual: true }));
}

export async function incomingFollowRequestViews(accountId: string, page: Page) {
  const rows = await listIncomingFollowRequests(accountId, page.limit, page.offset);
  const pageRows = rows.slice(0, page.limit + 1);
  const accountsById = new Map(
    (await accountViewsByIds(pageRows.map((row) => row.id), accountId))
      .map((account) => [account.id, account]),
  );
  return {
    items: pageRows.flatMap((row) => {
      const account = accountsById.get(row.id);
      return account ? [{ account, createdAt: row.createdAt.toISOString() }] : [];
    }),
    hasMore: rows.length > page.limit,
  };
}

export async function blockedAccountViews(accountId: string) {
  const rows = await listBlockedAccountIds(accountId);
  return accountViewsByIds(
    rows.map((row) => row.id),
    accountId,
    { includeBlocked: true },
  );
}
