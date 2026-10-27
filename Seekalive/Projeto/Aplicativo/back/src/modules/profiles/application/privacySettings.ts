import type { PrivacyWrite } from "@workspace/api-zod";
import {
  findPrivacySettings,
  savePrivacySettings,
} from "../infrastructure/privacySettingsRepository";

export async function getPrivacySettings(accountId: string) {
  const settings = await findPrivacySettings(accountId);
  if (!settings) return null;

  return {
    profileVisibility: settings.isPrivate ? "private" as const : "public" as const,
    messages: settings.messagesPolicy,
    readReceipts: settings.readReceipts,
    version: settings.version,
  };
}

export async function updatePrivacySettings(accountId: string, input: PrivacyWrite) {
  const updated = await savePrivacySettings(accountId, input);
  if (!updated) return null;

  return {
    profileVisibility: input.profileVisibility,
    messages: input.messages,
    readReceipts: input.readReceipts,
    version: updated.version,
  };
}
