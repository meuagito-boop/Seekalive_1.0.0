import type { SocialRepost } from "@/types/content";

const STORAGE_KEY = "seekalive-social-account-activity";

export interface SocialAccountActivity {
  likedPostIds: string[];
  likedCommentIds: string[];
  bookmarkedPostIds: string[];
  reposts: SocialRepost[];
  readNotificationIds: string[];
  readMessageIds: string[];
  readConversationIds: string[];
}

export type SocialAccountActivityMap = Record<string, SocialAccountActivity>;

export function emptySocialAccountActivity(): SocialAccountActivity {
  return {
    likedPostIds: [],
    likedCommentIds: [],
    bookmarkedPostIds: [],
    reposts: [],
    readNotificationIds: [],
    readMessageIds: [],
    readConversationIds: [],
  };
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];
}

export function normalizeSocialAccountActivity(value: unknown): SocialAccountActivity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptySocialAccountActivity();
  const record = value as Record<string, unknown>;
  const reposts = Array.isArray(record.reposts)
    ? record.reposts.filter((item): item is SocialRepost =>
        !!item && typeof item === "object" &&
        typeof (item as SocialRepost).id === "string" &&
        typeof (item as SocialRepost).postId === "string" &&
        typeof (item as SocialRepost).authorId === "string" &&
        typeof (item as SocialRepost).createdAt === "string")
    : [];

  return {
    likedPostIds: stringIds(record.likedPostIds),
    likedCommentIds: stringIds(record.likedCommentIds),
    bookmarkedPostIds: stringIds(record.bookmarkedPostIds),
    reposts,
    readNotificationIds: stringIds(record.readNotificationIds),
    readMessageIds: stringIds(record.readMessageIds),
    readConversationIds: stringIds(record.readConversationIds),
  };
}

export function getSocialAccountActivity(
  map: SocialAccountActivityMap,
  accountId: string,
): SocialAccountActivity {
  return normalizeSocialAccountActivity(map[accountId]);
}

export function updateSocialAccountActivity(
  map: SocialAccountActivityMap,
  accountId: string,
  update: (current: SocialAccountActivity) => SocialAccountActivity,
): SocialAccountActivityMap {
  return {
    ...map,
    [accountId]: normalizeSocialAccountActivity(update(getSocialAccountActivity(map, accountId))),
  };
}

export function readSocialAccountActivityMap(): SocialAccountActivityMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([accountId]) => accountId.length > 0)
        .map(([accountId, activity]) => [accountId, normalizeSocialAccountActivity(activity)]),
    );
  } catch {
    return {};
  }
}

export function saveSocialAccountActivityMap(map: SocialAccountActivityMap): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch {
    console.warn("Could not save account-specific social activity in this browser.");
    return false;
  }
}
