import type { SocialActivity } from "@/modules/social/types/socialActivity";
import type { SocialRepost } from "@/modules/social/types/posts";

const STORAGE_KEY = "seekalive-social-account-activity";

export interface AccountActivity extends SocialActivity {
  readNotificationIds: string[];
  readMessageIds: string[];
  readConversationIds: string[];
}

export type AccountActivityMap = Record<string, AccountActivity>;

export function emptyAccountActivity(): AccountActivity {
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

export function normalizeAccountActivity(value: unknown): AccountActivity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyAccountActivity();
  const record = value as Record<string, unknown>;
  const reposts = Array.isArray(record.reposts)
    ? record.reposts.filter((item): item is SocialActivity["reposts"][number] =>
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

export function getAccountActivity(
  map: AccountActivityMap,
  accountId: string,
): AccountActivity {
  return normalizeAccountActivity(map[accountId]);
}

export function updateAccountActivity(
  map: AccountActivityMap,
  accountId: string,
  update: (current: AccountActivity) => AccountActivity,
): AccountActivityMap {
  return {
    ...map,
    [accountId]: normalizeAccountActivity(update(getAccountActivity(map, accountId))),
  };
}

export function readAccountActivityMap(): AccountActivityMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([accountId]) => accountId.length > 0)
        .map(([accountId, activity]) => [accountId, normalizeAccountActivity(activity)]),
    );
  } catch {
    return {};
  }
}

export function saveAccountActivityMap(map: AccountActivityMap): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch {
    console.warn("Could not save account-specific social activity in this browser.");
    return false;
  }
}
