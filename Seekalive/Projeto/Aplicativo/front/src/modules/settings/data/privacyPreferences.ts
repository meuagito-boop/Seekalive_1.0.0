import { accountPreferenceKey, readBrowserPreference, writeBrowserPreference } from "./browserPreferenceStorage";

const PRIVACY_KEY = "seekalive-settings-privacy";

export interface PrivacyPreferences {
  profilePrivate: boolean;
  messages: "everyone" | "circle" | "nobody";
  readReceipts: boolean;
}

export const defaultPrivacyPreferences: PrivacyPreferences = {
  profilePrivate: false,
  messages: "everyone",
  readReceipts: true,
};

export const getPrivacyPreferences = (accountId?: string) =>
  readBrowserPreference(accountPreferenceKey(PRIVACY_KEY, accountId), defaultPrivacyPreferences);

export const savePrivacyPreferences = (value: PrivacyPreferences, accountId?: string) =>
  writeBrowserPreference(accountPreferenceKey(PRIVACY_KEY, accountId), value);
