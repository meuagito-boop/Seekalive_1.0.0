import { accountPreferenceKey, readBrowserPreference, writeBrowserPreference } from "./browserPreferenceStorage";

const APPEARANCE_KEY = "seekalive-settings-appearance";

export interface AppearancePreferences {
  fontSize: 16 | 18 | 20;
}

export const defaultAppearancePreferences: AppearancePreferences = { fontSize: 16 };

export const getAppearancePreferences = (accountId?: string) =>
  readBrowserPreference(accountPreferenceKey(APPEARANCE_KEY, accountId), defaultAppearancePreferences);

export const saveAppearancePreferences = (value: AppearancePreferences, accountId?: string) =>
  writeBrowserPreference(accountPreferenceKey(APPEARANCE_KEY, accountId), value);
