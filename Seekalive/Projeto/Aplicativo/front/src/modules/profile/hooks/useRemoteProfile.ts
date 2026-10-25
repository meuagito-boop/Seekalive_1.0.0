import { useEffect, useState } from "react";
import type { User } from "@/modules/profile/types/user";

interface UseRemoteProfileOptions {
  username: string | undefined;
  isRemoteSocialSession: boolean;
  isMe: boolean;
  remoteUser: User | undefined;
  loadRemoteProfile: (username: string) => Promise<User | null>;
}

export function useRemoteProfile({
  username,
  isRemoteSocialSession,
  isMe,
  remoteUser,
  loadRemoteProfile,
}: UseRemoteProfileOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!isRemoteSocialSession || isMe || !username || remoteUser) {
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);
    loadRemoteProfile(username)
      .then((user) => {
        if (active && !user) setError("Perfil indisponível.");
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, isMe, username, remoteUser?.id, retryVersion, loadRemoteProfile]);

  return {
    isLoading,
    error,
    retry: () => setRetryVersion((version) => version + 1),
  };
}
