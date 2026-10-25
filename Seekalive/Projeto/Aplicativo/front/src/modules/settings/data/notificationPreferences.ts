import { accountPreferenceKey, readBrowserPreference, writeBrowserPreference } from "./browserPreferenceStorage";

const NOTIFICATIONS_KEY = "seekalive-settings-notifications";

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  categories: Record<string, boolean>;
}

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

export const getNotificationPreferences = (accountId?: string) =>
  readBrowserPreference(accountPreferenceKey(NOTIFICATIONS_KEY, accountId), defaultNotificationPreferences);

export const saveNotificationPreferences = (value: NotificationPreferences, accountId?: string) =>
  writeBrowserPreference(accountPreferenceKey(NOTIFICATIONS_KEY, accountId), value);
