const PRIVACY_KEY = "seekalive-settings-privacy";
const NOTIFICATIONS_KEY = "seekalive-settings-notifications";
const APPEARANCE_KEY = "seekalive-settings-appearance";

export interface PrivacyPreferences {
  profilePrivate: boolean;
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
  messages: "everyone",
  readReceipts: true,
};

export const defaultNotificationPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  categories: {
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
  return accountId ? `${PRIVACY_KEY}:${accountId}` : PRIVACY_KEY;
}

export const getPrivacyPreferences = (accountId?: string) => read(privacyKey(accountId), defaultPrivacyPreferences);
export const savePrivacyPreferences = (value: PrivacyPreferences, accountId?: string) => write(privacyKey(accountId), value);
function notificationKey(accountId?: string) {
  return accountId ? `${NOTIFICATIONS_KEY}:${accountId}` : NOTIFICATIONS_KEY;
}
export const getNotificationPreferences = (accountId?: string) => read(notificationKey(accountId), defaultNotificationPreferences);
export const saveNotificationPreferences = (value: NotificationPreferences, accountId?: string) => write(notificationKey(accountId), value);
function appearanceKey(accountId?: string) {
  return accountId ? `${APPEARANCE_KEY}:${accountId}` : APPEARANCE_KEY;
}
export const getAppearancePreferences = (accountId?: string) => read(appearanceKey(accountId), defaultAppearancePreferences);
export const saveAppearancePreferences = (value: AppearancePreferences, accountId?: string) => write(appearanceKey(accountId), value);
