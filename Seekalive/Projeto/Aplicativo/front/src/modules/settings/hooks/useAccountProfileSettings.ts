import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { MyAccountResponse } from "@workspace/api-client-react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import type { User } from "@/modules/profile/types/user";
import { myAccountToUser, socialGraphApi } from "@/modules/social/services/socialGraphApi";
import { useToast } from "@/modules/shared/hooks/useToast";
import { draftFromUser, type AccountDraft } from "@/modules/settings/types/accountDraft";
import { accountRequestError } from "@/modules/settings/utils/accountRequestError";

export function useAccountProfileSettings() {
  const { currentUser, updateAccount } = useAppContext();
  const { updateUser, upsertRemoteUser, isRemoteSocialSession } = useSocial();
  const { toast } = useToast();
  const [remoteProfile, setRemoteProfile] = useState<MyAccountResponse | null>(null);
  const [draft, setDraft] = useState<AccountDraft>(() => draftFromUser(currentUser));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isRemoteSocialSession);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [retryLoad, setRetryLoad] = useState(0);

  useEffect(() => {
    if (!isRemoteSocialSession) {
      setRemoteProfile(null);
      setDraft(draftFromUser(currentUser));
      setLoadError(null);
      setIsLoading(false);
      return;
    }
    if (!currentUser) return;

    let active = true;
    setIsLoading(true);
    setLoadError(null);
    void socialGraphApi.getMyAccount()
      .then((profile) => {
        if (!active) return;
        const user = myAccountToUser(profile);
        setRemoteProfile(profile);
        setDraft(draftFromUser(user));
        updateAccount(user);
        updateUser(user);
        upsertRemoteUser(user);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(accountRequestError(error));
        setRemoteProfile(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isRemoteSocialSession, retryLoad]);

  const accountType = remoteProfile?.account.accountType ?? currentUser?.accountType;
  const isCommercial = accountType === "commercial";
  const email = remoteProfile?.email ?? currentUser?.email ?? "";
  const currentUsername = remoteProfile?.account.username ?? currentUser?.username ?? "";

  function changeDraft<K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setProfileError(null);
  }

  function syncUpdatedUser(user: User) {
    updateAccount(user);
    updateUser(user);
    if (isRemoteSocialSession) upsertRemoteUser(user);
    setDraft(draftFromUser(user));
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !accountType) return;
    const displayName = isCommercial
      ? draft.businessName.trim()
      : `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();

    if (
      (isCommercial
        ? draft.businessName.trim().length < 2
        : draft.firstName.trim().length < 2 || draft.lastName.trim().length < 2)
    ) {
      setProfileError(isCommercial
        ? "Informe um nome comercial válido."
        : "Informe nome e sobrenome válidos.");
      return;
    }
    if (displayName.length > 100) {
      setProfileError("O nome público não pode ultrapassar 100 caracteres.");
      return;
    }
    if (isCommercial && [
      draft.address,
      draft.postalCode,
      draft.cityName,
      draft.stateName,
      draft.countryName,
    ].some((value) => value.trim().length < 2)) {
      setProfileError("Preencha endereço, CEP, cidade, estado e país.");
      return;
    }
    if (isRemoteSocialSession && !remoteProfile) {
      setProfileError("Recarregue os dados da conta antes de salvar.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      if (isRemoteSocialSession) {
        const updatedProfile = await socialGraphApi.updateMyAccount(isCommercial
          ? {
              displayName,
              commercialProfile: {
                address: draft.address.trim(),
                postalCode: draft.postalCode.trim(),
                cityName: draft.cityName.trim(),
                stateName: draft.stateName.trim(),
                countryName: draft.countryName.trim(),
              },
              version: remoteProfile!.account.version,
            }
          : {
              firstName: draft.firstName.trim(),
              lastName: draft.lastName.trim(),
              version: remoteProfile!.account.version,
            });
        setRemoteProfile(updatedProfile);
        syncUpdatedUser(myAccountToUser(updatedProfile));
        toast({ title: "Dados da conta atualizados", description: "As alterações foram salvas na sua conta." });
        return;
      }

      const updatedUser: User = isCommercial
        ? {
            ...currentUser,
            displayName,
            address: draft.address.trim(),
            postalCode: draft.postalCode.trim(),
            city: draft.cityName.trim(),
            state: draft.stateName.trim(),
            country: draft.countryName.trim(),
            location: `${draft.cityName.trim()}, ${draft.stateName.trim()}`,
            commercialProfile: currentUser.commercialProfile
              ? {
                  ...currentUser.commercialProfile,
                  address: draft.address.trim(),
                  cityName: draft.cityName.trim(),
                  cityState: draft.stateName.trim(),
                }
              : currentUser.commercialProfile,
          }
        : {
            ...currentUser,
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
            displayName,
          };
      syncUpdatedUser(updatedUser);
      toast({ title: "Dados da demonstração atualizados", description: "A alteração fica neste navegador." });
    } catch (error) {
      const message = accountRequestError(error);
      setProfileError(message);
      toast({ title: "Dados não salvos", description: message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleEmailChanged(nextEmail: string) {
    setRemoteProfile((profile) => profile ? { ...profile, email: nextEmail } : profile);
    if (!currentUser) return;
    const updatedUser = { ...currentUser, email: nextEmail };
    updateAccount(updatedUser);
    updateUser(updatedUser);
    upsertRemoteUser(updatedUser);
  }

  return {
    accountType,
    changeDraft,
    currentUser,
    currentUsername,
    draft,
    email,
    handleEmailChanged,
    isCommercial,
    isLoading,
    isRemoteSocialSession,
    isSavingProfile,
    loadError,
    profileError,
    remoteProfile,
    retry: () => setRetryLoad((value) => value + 1),
    setProfileError,
    setRemoteProfile,
    submitProfile,
    syncUpdatedUser,
  };
}
