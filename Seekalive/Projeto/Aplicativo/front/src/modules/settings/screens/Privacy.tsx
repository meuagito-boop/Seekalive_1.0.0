import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { SettingsSubheader } from "@/modules/settings/screens/SettingsSubheader";
import { FollowRequestsSection } from "@/modules/settings/components/privacy/FollowRequestsSection";
import { PrivacyPreferencesSection } from "@/modules/settings/components/privacy/PrivacyPreferencesSection";
import { usePrivacySettings } from "@/modules/settings/hooks/usePrivacySettings";

export default function SettingsPrivacy() {
  const [, setLocation] = useLocation();
  const privacy = usePrivacySettings();
  const preferencesDisabled = privacy.privacyLoading
    || privacy.saving
    || (privacy.isRemoteSocialSession && privacy.privacyVersion === null);

  return (
    <div className="min-h-[100dvh] pb-16 md:pb-0">
      <SettingsSubheader title="Privacidade" />
      <p className="px-4 pt-3 text-xs text-muted-foreground">
        {privacy.isRemoteSocialSession
          ? "As configurações são salvas na sua conta."
          : "As escolhas ficam salvas neste navegador. Perfis privados e regras de Círculo são aplicados no protótipo."}
      </p>
      {privacy.privacyError && (
        <p role="alert" className="px-4 pt-3 text-sm text-destructive">
          {privacy.privacyError}{" "}
          {privacy.isRemoteSocialSession && privacy.privacyVersion === null && (
            <button type="button" className="font-semibold underline" onClick={privacy.retryPrivacy}>
              Tentar novamente
            </button>
          )}
        </p>
      )}
      {privacy.privacyLoading && (
        <p role="status" className="px-4 pt-3 text-sm text-muted-foreground">Carregando configurações…</p>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <FollowRequestsSection
          requests={privacy.incomingFollowRequests}
          getUserById={privacy.getUserById}
          isLoading={privacy.socialGraphLoading}
          isWorking={(requestId) => privacy.workingRequestId === requestId}
          error={privacy.socialGraphError}
          onRetry={privacy.retrySocialGraph}
          onAccept={(requestId) => void privacy.handleFollowRequest(requestId, "accept")}
          onDecline={(requestId) => void privacy.handleFollowRequest(requestId, "decline")}
        />
        <PrivacyPreferencesSection
          preferences={privacy.prefs}
          disabled={preferencesDisabled}
          onUpdate={privacy.update}
          onOpenBlockedUsers={() => setLocation("/settings/blocked")}
        />
      </motion.div>
    </div>
  );
}
