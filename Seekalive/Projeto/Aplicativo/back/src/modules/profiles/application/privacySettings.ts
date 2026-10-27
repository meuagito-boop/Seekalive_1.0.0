import type { PrivacyWrite } from "@workspace/api-zod";
import type { PrivacySettingsReader, PrivacySettingsWriter } from "./ports";

export function createPrivacySettingsService(dependencies: {
  findPrivacySettings: PrivacySettingsReader;
  savePrivacySettings: PrivacySettingsWriter;
}) {
  return {
    async getPrivacySettings(accountId: string) {
      const settings = await dependencies.findPrivacySettings(accountId);
      if (!settings) return null;

      return {
        profileVisibility: settings.isPrivate
          ? ("private" as const)
          : ("public" as const),
        messages: settings.messagesPolicy,
        readReceipts: settings.readReceipts,
        version: settings.version,
      };
    },

    async updatePrivacySettings(accountId: string, input: PrivacyWrite) {
      const updated = await dependencies.savePrivacySettings(accountId, input);
      if (!updated) return null;

      return {
        profileVisibility: input.profileVisibility,
        messages: input.messages,
        readReceipts: input.readReceipts,
        version: updated.version,
      };
    },
  };
}

export type PrivacySettingsService = ReturnType<
  typeof createPrivacySettingsService
>;
