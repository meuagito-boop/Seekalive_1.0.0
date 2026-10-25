import { useEffect, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { MyAccountResponse } from "@workspace/api-client-react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import { useToast } from "@/modules/shared/hooks/useToast";
import { myAccountToUser, socialGraphApi } from "@/modules/social/services/socialGraphApi";
import type { User } from "@/modules/profile/types/user";
import { accountRequestError } from "@/modules/settings/utils/accountRequestError";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

interface UseUsernameSettingsOptions {
  accountType: User["accountType"] | undefined;
  currentUsername: string;
  isRemoteSocialSession: boolean;
  remoteProfile: MyAccountResponse | null;
  setRemoteProfile: Dispatch<SetStateAction<MyAccountResponse | null>>;
  syncUpdatedUser: (user: User) => void;
}

export function useUsernameSettings({
  accountType,
  currentUsername,
  isRemoteSocialSession,
  remoteProfile,
  setRemoteProfile,
  syncUpdatedUser,
}: UseUsernameSettingsOptions) {
  const { currentUser } = useAppContext();
  const { users } = useSocial();
  const { toast } = useToast();
  const [username, setUsername] = useState(currentUser?.username ?? "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  useEffect(() => {
    setUsername(remoteProfile?.account.username ?? currentUser?.username ?? "");
  }, [remoteProfile?.account.username, currentUser?.username]);

  async function submitUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !accountType) return;
    const nextUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!USERNAME_RE.test(nextUsername)) {
      setUsernameError("Use de 3 a 20 caracteres: letras minúsculas, números ou _.");
      return;
    }
    if (nextUsername === currentUsername) {
      setUsernameError("Esse já é o seu nome de usuário.");
      return;
    }
    if (!isRemoteSocialSession && users.some(
      (user) => user.id !== currentUser.id && user.username.toLowerCase() === nextUsername,
    )) {
      setUsernameError("Esse nome de usuário já está em uso na demonstração.");
      return;
    }
    if (isRemoteSocialSession && !remoteProfile) {
      setUsernameError("Recarregue os dados da conta antes de salvar.");
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      if (isRemoteSocialSession) {
        const updatedProfile = await socialGraphApi.updateMyAccount({
          username: nextUsername,
          version: remoteProfile!.account.version,
        });
        setRemoteProfile(updatedProfile);
        syncUpdatedUser(myAccountToUser(updatedProfile));
      } else {
        syncUpdatedUser({ ...currentUser, username: nextUsername });
      }
      setUsername(nextUsername);
      toast({
        title: "Nome de usuário alterado",
        description: isRemoteSocialSession
          ? `Agora sua conta é @${nextUsername}.`
          : `Agora a demonstração é @${nextUsername} neste navegador.`,
      });
    } catch (error) {
      const message = accountRequestError(error);
      setUsernameError(message);
      toast({ title: "Nome de usuário não alterado", description: message, variant: "destructive" });
    } finally {
      setIsSavingUsername(false);
    }
  }

  return {
    isSavingUsername,
    setUsername,
    setUsernameError,
    submitUsername,
    username,
    usernameError,
  };
}
