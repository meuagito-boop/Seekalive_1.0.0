import { useEffect, useState } from "react";
import { getPrivacyPreferences, savePrivacyPreferences, type PrivacyPreferences } from "@/modules/settings/data/preferences";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import { toast } from "@/modules/shared/hooks/useToast";
import { socialGraphApi } from "@/modules/social/services/socialGraphApi";

export function usePrivacySettings() {
  const { currentUser, updateAccount } = useAppContext();
  const {
    updateUser,
    incomingFollowRequests,
    getUserById,
    acceptFollowRequest,
    declineFollowRequest,
    isRemoteSocialSession,
    socialGraphLoading,
    socialGraphError,
    retrySocialGraph,
    upsertRemoteUser,
  } = useSocial();

  const [prefs, setPrefs] = useState<PrivacyPreferences>(() => {
    const stored = getPrivacyPreferences(currentUser?.id);
    return {
      ...stored,
      profilePrivate: currentUser?.isPrivate ?? stored.profilePrivate,
    };
  });
  const [privacyVersion, setPrivacyVersion] = useState<number | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState(isRemoteSocialSession);
  const [saving, setSaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [workingRequestId, setWorkingRequestId] = useState<string | null>(null);
  const [privacyRetry, setPrivacyRetry] = useState(0);

  useEffect(() => {
    if (!isRemoteSocialSession) {
      setPrivacyLoading(false);
      return;
    }
    let active = true;
    setPrivacyLoading(true);
    setPrivacyError(null);
    void socialGraphApi.getPrivacySettings()
      .then((settings) => {
        if (!active) return;
        setPrefs({
          profilePrivate: settings.profileVisibility === "private",
          messages: settings.messages,
          readReceipts: settings.readReceipts,
        });
        setPrivacyVersion(settings.version);
      })
      .catch((error: unknown) => {
        if (active) {
          setPrivacyError(error instanceof Error ? error.message : "Não foi possível carregar as configurações.");
        }
      })
      .finally(() => {
        if (active) setPrivacyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, currentUser?.id, privacyRetry]);

  async function update<K extends keyof PrivacyPreferences>(key: K, value: PrivacyPreferences[K]) {
    const next = { ...prefs, [key]: value };
    if (isRemoteSocialSession) {
      if (!currentUser || privacyVersion === null) return;
      setSaving(true);
      setPrivacyError(null);
      try {
        const settings = await socialGraphApi.updatePrivacySettings({
          profileVisibility: next.profilePrivate ? "private" : "public",
          messages: next.messages,
          readReceipts: next.readReceipts,
          version: privacyVersion,
        });
        const updatedPreferences: PrivacyPreferences = {
          profilePrivate: settings.profileVisibility === "private",
          messages: settings.messages,
          readReceipts: settings.readReceipts,
        };
        setPrefs(updatedPreferences);
        setPrivacyVersion(settings.version);
        if (key === "profilePrivate") {
          const updated = { ...currentUser, isPrivate: settings.profileVisibility === "private" };
          updateAccount(updated);
          upsertRemoteUser(updated);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível salvar a configuração.";
        setPrivacyError(message);
        toast({ title: "Configuração não salva", description: message, variant: "destructive" });
        if ((error as { status?: number })?.status === 409) {
          try {
            const latest = await socialGraphApi.getPrivacySettings();
            setPrefs({
              profilePrivate: latest.profileVisibility === "private",
              messages: latest.messages,
              readReceipts: latest.readReceipts,
            });
            setPrivacyVersion(latest.version);
          } catch {
            // Preserva a mensagem de conflito sem substituir a escolha local por dados possivelmente antigos.
          }
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    setPrefs((previous) => {
      const updated = { ...previous, [key]: value };
      savePrivacyPreferences(updated, currentUser?.id);
      return updated;
    });
    if (key === "profilePrivate" && currentUser) {
      const updated = { ...currentUser, isPrivate: Boolean(value) };
      updateAccount(updated);
      updateUser(updated);
    }
  }

  async function handleFollowRequest(requestId: string, action: "accept" | "decline") {
    setWorkingRequestId(requestId);
    try {
      if (action === "accept") {
        await acceptFollowRequest(requestId);
      } else {
        await declineFollowRequest(requestId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a solicitação.";
      setPrivacyError(message);
      toast({ title: "Solicitação não atualizada", description: message, variant: "destructive" });
    } finally {
      setWorkingRequestId(null);
    }
  }

  return {
    currentUser,
    incomingFollowRequests,
    getUserById,
    isRemoteSocialSession,
    socialGraphLoading,
    socialGraphError,
    retrySocialGraph,
    prefs,
    privacyVersion,
    privacyLoading,
    saving,
    privacyError,
    workingRequestId,
    retryPrivacy: () => setPrivacyRetry((version) => version + 1),
    update,
    handleFollowRequest,
  };
}
