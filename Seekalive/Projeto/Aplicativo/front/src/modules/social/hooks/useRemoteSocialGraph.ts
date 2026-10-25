import { useCallback, useEffect, useState } from "react";
import type { User } from "@/modules/profile/types/user";
import type { FollowRequest } from "@/modules/social/types/followRequest";
import { toast } from "@/hooks/use-toast";
import {
  accountViewToUser,
  followRequestToModel,
  myAccountToUser,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";

interface UseRemoteSocialGraphOptions {
  currentUser?: User;
  isRemoteSocialSession: boolean;
  addRemoteUser: (user: User) => void;
  updateAccount: (user: User) => void;
}

export function useRemoteSocialGraph({
  currentUser,
  isRemoteSocialSession,
  addRemoteUser,
  updateAccount,
}: UseRemoteSocialGraphOptions) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!isRemoteSocialSession || !currentUser) {
      setBlockedUserIds([]);
      setFollowRequests([]);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setBlockedUserIds([]);
    setFollowRequests([]);
    Promise.all([
      socialGraphApi.getMyAccount(),
      socialGraphApi.getIncomingFollowRequests(),
      socialGraphApi.getBlockedAccounts(),
    ]).then(([ownerAccount, requestsPage, blockedAccounts]) => {
      if (!active) return;
      const accountUser = myAccountToUser(ownerAccount);
      const incoming = requestsPage.items.map((request) =>
        followRequestToModel(request, ownerAccount.account.id),
      );
      const blockedUsers = blockedAccounts.items.map(accountViewToUser);
      const remoteUsers = [
        accountUser,
        ...requestsPage.items.map((request) => accountViewToUser(request.account)),
        ...blockedUsers,
      ];
      remoteUsers.forEach(addRemoteUser);
      updateAccount(accountUser);
      setFollowRequests(incoming);
      setBlockedUserIds(blockedUsers.map((user) => user.id));
    }).catch((requestError: unknown) => {
      if (!active) return;
      const message = requestError instanceof Error
        ? requestError.message
        : "Não foi possível carregar as conexões da conta.";
      setError(message);
      toast({
        title: "Falha ao carregar conexões",
        description: message,
        variant: "destructive",
      });
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isRemoteSocialSession, retry]);

  const retrySocialGraph = useCallback(() => setRetry((previous) => previous + 1), []);

  return {
    blockedUserIds,
    setBlockedUserIds,
    followRequests,
    setFollowRequests,
    loading,
    error,
    retrySocialGraph,
  };
}
