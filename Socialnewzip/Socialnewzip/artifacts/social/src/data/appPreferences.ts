const PRIVACY_KEY = "seekalive-settings-privacy";
const LEGACY_PRIVACY_KEY = PRIVACY_KEY;
const NOTIFICATIONS_KEY = "seekalive-settings-notifications";
const APPEARANCE_KEY = "seekalive-settings-appearance";

export interface PrivacyPreferences {
  profilePrivate: boolean;
  circleRequests: "everyone" | "followers" | "nobody";
  messages: "everyone" | "circle" | "nobody";
  readReceipts: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  categories: Record<string, boolean>;
}

export interface AppearancePreferences {
  fontSize: 16 | 18 | 20;
}

export const defaultPrivacyPreferences: PrivacyPreferences = {
  profilePrivate: false,
  circleRequests: "everyone",
  messages: "everyone",
  readReceipts: true,
};

export const defaultNotificationPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  categories: {
    circle_requests: true,
    circle_accepted: true,
    new_followers: true,
    mentions_posts: true,
    mentions_comments: true,
    likes: true,
    reposts: true,
    dm: true,
  },
};

export const defaultAppearancePreferences: AppearancePreferences = { fontSize: 16 };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return stored && typeof stored === "object" ? { ...fallback, ...stored } as T : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Could not save Seekalive preferences in this browser.");
  }
}

function privacyKey(accountId?: string) {
  return accountId ? `${PRIVACY_KEY}:${accountId}` : LEGACY_PRIVACY_KEY;
}

export const getPrivacyPreferences = (accountId?: string) => read(privacyKey(accountId), defaultPrivacyPreferences);
export const savePrivacyPreferences = (value: PrivacyPreferences, accountId?: string) => write(privacyKey(accountId), value);
export const getNotificationPreferences = () => read(NOTIFICATIONS_KEY, defaultNotificationPreferences);
export const saveNotificationPreferences = (value: NotificationPreferences) => write(NOTIFICATIONS_KEY, value);
export const getAppearancePreferences = () => read(APPEARANCE_KEY, defaultAppearancePreferences);
export const saveAppearancePreferences = (value: AppearancePreferences) => write(APPEARANCE_KEY, value);

const INTERESTS_PREFIX = "seekalive-onboarding-interests:";
export function saveAccountInterests(accountId: string, interests: string[], skipped: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${INTERESTS_PREFIX}${accountId}`, JSON.stringify({
      interests,
      skipped,
      completedAt: new Date().toISOString(),
    }));
  } catch {
    console.warn("Could not save onboarding interests in this browser.");
  }
}

export function getAccountInterests(accountId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(`${INTERESTS_PREFIX}${accountId}`) ?? "null");
    return saved && Array.isArray(saved.interests) ? saved.interests.filter((item: unknown) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
