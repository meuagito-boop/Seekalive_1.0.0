import {
  acceptFollowRequest,
  blockAccount,
  declineFollowRequest,
  followAccount,
  getBlockedAccounts,
  getCircle,
  getFollowers,
  getFollowing,
  getIncomingFollowRequests,
  getMyAccount,
  getMyPrivacySettings,
  getProfileByAccountId,
  getProfileByUsername,
  searchAccounts,
  updateMyAccount as updateMyAccountRequest,
  unblockAccount,
  unfollowAccount,
  updateMyPrivacySettings,
} from "@workspace/api-client-react";
import type {
  AccountView,
  AccountPatch,
  MyAccountResponse,
  PrivacySettings,
  PrivacySettingsWrite,
  ProfileResponse,
} from "@workspace/api-client-react";
import { API_ERROR_CODES, type ApiErrorKey } from "@workspace/api-zod";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import type { Post } from "@/modules/social/types/post";
import type { User } from "@/modules/profile/types/user";
import { getCsrfToken } from "@/modules/app/api/httpClient";
import { readApiError } from "@/modules/app/api/apiErrors";
import { parsePost } from "@/modules/social/services/socialHttp";

type RequestOptions = Parameters<typeof getMyAccount>[0];

export class SocialGraphApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: number,
    readonly key?: ApiErrorKey,
  ) {
    super(message);
    this.name = "SocialGraphApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeError(error: unknown): SocialGraphApiError {
  const fallbackMessage =
    error instanceof Error
      ? error.message
      : "Não foi possível concluir a solicitação.";
  const parsed = readApiError(error, fallbackMessage);
  const status =
    isRecord(error) && typeof error.status === "number"
      ? error.status
      : undefined;
  return new SocialGraphApiError(
    parsed.message,
    status,
    parsed.code,
    parsed.key,
  );
}

async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeError(error);
  }
}

const readOptions: RequestOptions = { credentials: "include" };

async function write<T>(
  operation: (options: RequestOptions) => Promise<T>,
): Promise<T> {
  return request(async () => {
    const csrfToken = await getCsrfToken();
    return operation({
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken },
    });
  });
}

export function accountViewToUser(account: AccountView): User {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    bio: account.bio,
    avatarUrl: account.avatarUrl ?? "",
    coverUrl: account.coverUrl ?? "",
    location: account.location ?? undefined,
    website: account.website ?? undefined,
    joinedAt: account.joinedAt,
    accountType: account.accountType,
    isPrivate: account.isPrivate,
    stats: { ...account.stats },
    isFollowing: account.relationship.following === "accepted",
    followRequestSent: account.relationship.following === "pending",
    isInCircle: account.relationship.inCircle,
    isBlockedByViewer: account.relationship.blockedByMe,
    blocksViewer: account.relationship.blockedByThem,
    isBlocked:
      account.relationship.blockedByMe || account.relationship.blockedByThem,
    source: "server",
  };
}

const commercialCategoryLabels: Record<string, string> = {
  restaurantes: "Restaurantes",
  bares: "Bares",
  cafes: "Cafés",
  servicos: "Serviços",
  compras: "Compras",
  saude: "Saúde e beleza",
  lazer: "Lazer",
};

type CommercialProfileDetails = {
  categoryKey: string;
  discoveryKind: "place" | "provider";
  address: string;
  postalCode: string;
  cityName: string;
  stateName: string;
  countryName: string;
};

function withCommercialProfile(
  user: User,
  details: CommercialProfileDetails,
): User {
  const category =
    commercialCategoryLabels[details.categoryKey] ?? details.categoryKey;
  const location = `${details.cityName}, ${details.stateName}`;

  return {
    ...user,
    address: details.address,
    postalCode: details.postalCode,
    city: details.cityName,
    state: details.stateName,
    country: details.countryName,
    location,
    commercialProfile: {
      categoryKey: details.categoryKey,
      category,
      discoveryKind: details.discoveryKind,
      address: details.address,
      cityName: details.cityName,
      cityState: details.stateName,
      tags: [],
    },
  };
}

export function profileResponseToUser(profile: ProfileResponse): User {
  const user = accountViewToUser(profile.account);
  if (
    profile.account.accountType !== "commercial" ||
    !profile.commercialProfile
  ) {
    return user;
  }

  return withCommercialProfile(user, profile.commercialProfile);
}

export function profileResponseToPosts(profile: ProfileResponse): Post[] {
  return [...profile.posts.items, ...profile.articles.items]
    .map((item) => parsePost(item))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function myAccountToUser(response: MyAccountResponse): User {
  const user = accountViewToUser(response.account);
  const commercial = response.commercialProfile;
  if (response.account.accountType === "commercial" && !commercial) {
    throw new SocialGraphApiError(
      "O perfil comercial da conta está incompleto. Os dados não foram substituídos por exemplos.",
      500,
      API_ERROR_CODES.ACCOUNT_PROFILE_INCOMPLETE,
      "ACCOUNT_PROFILE_INCOMPLETE",
    );
  }
  if (!commercial || response.account.accountType !== "commercial") {
    return {
      ...user,
      email: response.email,
      firstName: response.firstName ?? undefined,
      lastName: response.lastName ?? undefined,
    };
  }
  return withCommercialProfile(
    {
      ...user,
      email: response.email,
      firstName: response.firstName ?? undefined,
      lastName: response.lastName ?? undefined,
    },
    commercial,
  );
}

export function accountListToUsers(accounts: AccountView[]): User[] {
  return accounts.map(accountViewToUser);
}

export function followRequestToModel(
  request: { account: AccountView; createdAt: string },
  targetId: string,
): FollowRequest {
  return {
    id: request.account.id,
    requesterId: request.account.id,
    targetId,
    createdAt: request.createdAt,
  };
}

export const socialGraphApi = {
  getMyAccount: () => request(() => getMyAccount(readOptions)),
  updateMyAccount: (patch: AccountPatch) =>
    write((options) => updateMyAccountRequest(patch, options)),
  getProfileByAccountId: (accountId: string) =>
    request(() => getProfileByAccountId(accountId, readOptions)),
  getProfileByUsername: (username: string) =>
    request(() => getProfileByUsername(username, readOptions)),
  searchAccounts: (q: string, cursor?: string) =>
    request(() => searchAccounts({ q, limit: 20, cursor }, readOptions)),
  getFollowers: (accountId: string, cursor?: string) =>
    request(() => getFollowers(accountId, { limit: 20, cursor }, readOptions)),
  getFollowing: (accountId: string, cursor?: string) =>
    request(() => getFollowing(accountId, { limit: 20, cursor }, readOptions)),
  getIncomingFollowRequests: (cursor?: string) =>
    request(() =>
      getIncomingFollowRequests({ limit: 100, cursor }, readOptions),
    ),
  getCircle: (cursor?: string) =>
    request(() => getCircle({ limit: 20, cursor }, readOptions)),
  getBlockedAccounts: () => request(() => getBlockedAccounts(readOptions)),
  getPrivacySettings: (): Promise<PrivacySettings> =>
    request(() => getMyPrivacySettings(readOptions)),
  follow: (accountId: string) =>
    write((options) => followAccount(accountId, options)),
  unfollow: (accountId: string) =>
    write((options) => unfollowAccount(accountId, options)),
  acceptFollowRequest: (accountId: string) =>
    write((options) => acceptFollowRequest(accountId, options)),
  declineFollowRequest: (accountId: string) =>
    write((options) => declineFollowRequest(accountId, options)),
  block: (accountId: string) =>
    write((options) => blockAccount(accountId, options)),
  unblock: (accountId: string) =>
    write((options) => unblockAccount(accountId, options)),
  updatePrivacySettings: (settings: PrivacySettingsWrite) =>
    write((options) => updateMyPrivacySettings(settings, options)),
};
