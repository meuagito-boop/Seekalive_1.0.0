import type { AccountReadPort } from "../../accounts/application/ports";
import type { createAccountViews } from "../../accounts/application/accountViews";
import type { PublicAccountRow } from "../../accounts/domain/publicAccount";
import { canViewPrivateProfileContent } from "../../accounts/domain/accountVisibility";
import type { ListProfilePosts } from "../../feed/application/listProfilePosts";
import type { RelationshipView } from "../../social/domain/relationshipView";
import { usernameFormatSchema } from "@workspace/api-zod";
import type {
  CommercialProfileDetails,
  CommercialProfileDetailsReader,
} from "./commercialProfileDetails";

const emptyPage = { items: [], nextCursor: null };
type AccountViewReader = ReturnType<typeof createAccountViews>["accountView"];

export type PublicProfileDependencies = {
  accountView: AccountViewReader;
  findActiveAccountById: AccountReadPort["findActiveAccountById"];
  findActiveAccountByUsername: AccountReadPort["findActiveAccountByUsername"];
  readCommercialProfileDetails: CommercialProfileDetailsReader;
  getRelationshipFor: (
    viewerId: string | null,
    targetId: string,
  ) => Promise<RelationshipView>;
  isBlockedBetween: (
    firstAccountId: string,
    secondAccountId: string,
  ) => Promise<boolean>;
  listProfilePosts: ListProfilePosts;
};

export type PublicProfileResult<T> =
  | { kind: "not_found" }
  | { kind: "found"; data: T };

type ProfilePage = NonNullable<Awaited<ReturnType<ListProfilePosts>>>;

export type PublicProfileData = {
  account: Awaited<ReturnType<AccountViewReader>>;
  commercialProfile: CommercialProfileDetails | null;
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
  let commercialProfile: CommercialProfileDetails | null = null;
  if (row.accountType === "commercial" && canViewPublicContent) {
    commercialProfile = await dependencies.readCommercialProfileDetails(row.id);
    if (!commercialProfile) {
      throw new Error("Visible commercial account is missing profile details.");
    }
  }

  return {
    kind: "found",
    data: {
      account,
      commercialProfile,
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
  dependencies: PublicProfileDependencies,
): Promise<PublicProfileResult<PublicProfileData>> {
  const parsedUsername = usernameFormatSchema.safeParse(usernameInput);
  if (!parsedUsername.success) return { kind: "not_found" };
  const username = parsedUsername.data;

  const row = await dependencies.findActiveAccountByUsername(username);
  if (!row) return { kind: "not_found" };

  return composePublicProfile(row, viewerId, dependencies);
}

export async function getPublicAccountById(
  accountId: string,
  viewerId: string | null,
  dependencies: PublicProfileDependencies,
): Promise<PublicProfileResult<Awaited<ReturnType<AccountViewReader>>>> {
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

export type PublicProfileByUsernameQuery = (
  usernameInput: string,
  viewerId: string | null,
) => Promise<PublicProfileResult<PublicProfileData>>;
export type PublicAccountByIdQuery = (
  accountId: string,
  viewerId: string | null,
) => Promise<PublicProfileResult<Awaited<ReturnType<AccountViewReader>>>>;
