import {
  accountViewsByIds,
  accountView,
  findActiveAccountById,
  findActiveAccountByUsername,
  type PublicAccountRow,
} from "../../accounts/composition/publicApi";
import { canViewPrivateProfileContent } from "../../accounts/domain/accountVisibility";
import { createProfilePostListApi } from "../../feed/composition/publicApi";
import {
  getRelationshipFor,
  isBlockedBetween,
} from "../../social/composition/publicApi";

const listProfilePosts = createProfilePostListApi(accountViewsByIds);

const emptyPage = { items: [], nextCursor: null };

export type PublicProfileDependencies = {
  accountView: typeof accountView;
  findActiveAccountById: typeof findActiveAccountById;
  findActiveAccountByUsername: typeof findActiveAccountByUsername;
  getRelationshipFor: typeof getRelationshipFor;
  isBlockedBetween: typeof isBlockedBetween;
  listProfilePosts: typeof listProfilePosts;
};

const defaultDependencies: PublicProfileDependencies = {
  accountView,
  findActiveAccountById,
  findActiveAccountByUsername,
  getRelationshipFor,
  isBlockedBetween,
  listProfilePosts,
};

type PublicProfileResult<T> =
  | { kind: "not_found" }
  | { kind: "found"; data: T };

type ProfilePage = NonNullable<Awaited<ReturnType<typeof listProfilePosts>>>;

type PublicProfileData = {
  account: Awaited<ReturnType<typeof accountView>>;
  visibility: {
    canViewPublicContent: boolean;
    canViewCircleContent: boolean;
  };
  posts: ProfilePage;
  articles: ProfilePage;
  media: typeof emptyPage;
};

async function composePublicProfile(
  row: PublicAccountRow,
  viewerId: string | null,
  dependencies: PublicProfileDependencies,
): Promise<PublicProfileResult<PublicProfileData>> {
  if (viewerId && (await dependencies.isBlockedBetween(viewerId, row.id))) {
    return { kind: "not_found" };
  }

  const relationship = await dependencies.getRelationshipFor(viewerId, row.id);
  const canViewPublicContent = canViewPrivateProfileContent(
    row.isPrivate,
    viewerId,
    row.id,
    relationship.following,
  );
  const [account, posts, articles] = await Promise.all([
    dependencies.accountView(row, viewerId, relationship),
    dependencies.listProfilePosts(row.id, viewerId, 20, null, "text"),
    dependencies.listProfilePosts(row.id, viewerId, 20, null, "article"),
  ]);

  return {
    kind: "found",
    data: {
      account,
      visibility: {
        canViewPublicContent,
        canViewCircleContent: relationship.inCircle || viewerId === row.id,
      },
      posts: posts ?? emptyPage,
      articles: articles ?? emptyPage,
      media: emptyPage,
    },
  };
}

export async function getPublicProfileByUsername(
  usernameInput: string,
  viewerId: string | null,
  dependencies: PublicProfileDependencies = defaultDependencies,
): Promise<PublicProfileResult<PublicProfileData>> {
  const username = usernameInput.toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return { kind: "not_found" };

  const row = await dependencies.findActiveAccountByUsername(username);
  if (!row) return { kind: "not_found" };

  return composePublicProfile(row, viewerId, dependencies);
}

export async function getPublicAccountById(
  accountId: string,
  viewerId: string | null,
  dependencies: PublicProfileDependencies = defaultDependencies,
): Promise<PublicProfileResult<Awaited<ReturnType<typeof accountView>>>> {
  const row = await dependencies.findActiveAccountById(accountId);
  if (!row) return { kind: "not_found" };
  if (viewerId && (await dependencies.isBlockedBetween(viewerId, accountId))) {
    return { kind: "not_found" };
  }

  return {
    kind: "found",
    data: await dependencies.accountView(row, viewerId),
  };
}
