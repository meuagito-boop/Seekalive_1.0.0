import { useEffect, useRef, useState } from "react";
import { accountListToUsers, socialGraphApi } from "@/modules/social/services/socialGraphApi";
import type { User } from "@/modules/profile/types/user";

interface UseRemoteAccountSearchOptions {
  isRemoteSocialSession: boolean;
  normalizedQuery: string;
  currentUserId: string | undefined;
  upsertRemoteUser: (user: User) => void;
}

export function useRemoteAccountSearch({
  isRemoteSocialSession,
  normalizedQuery,
  currentUserId,
  upsertRemoteUser,
}: UseRemoteAccountSearchOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    if (!isRemoteSocialSession || normalizedQuery.length < 2) {
      setUsers([]);
      setNextCursor(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setUsers([]);
    setNextCursor(null);
    setError(null);
    setIsLoading(false);
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      void socialGraphApi.searchAccounts(normalizedQuery)
        .then((page) => {
          if (!active || requestGeneration !== generation.current) return;
          const accounts = accountListToUsers(page.items)
            .filter((account) => account.id !== currentUserId);
          accounts.forEach(upsertRemoteUser);
          setUsers(accounts);
          setNextCursor(page.nextCursor);
        })
        .catch((cause: unknown) => {
          if (active && requestGeneration === generation.current) {
            setError(cause instanceof Error ? cause.message : "Não foi possível buscar pessoas.");
          }
        })
        .finally(() => {
          if (active && requestGeneration === generation.current) setIsLoading(false);
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isRemoteSocialSession, normalizedQuery, retryVersion, currentUserId, upsertRemoteUser]);

  async function loadMore() {
    if (!nextCursor || isLoading || !isRemoteSocialSession) return;
    const requestGeneration = generation.current;
    setIsLoading(true);
    setError(null);
    try {
      const page = await socialGraphApi.searchAccounts(normalizedQuery, nextCursor);
      if (requestGeneration !== generation.current) return;
      const accounts = accountListToUsers(page.items)
        .filter((account) => account.id !== currentUserId);
      accounts.forEach(upsertRemoteUser);
      setUsers((existing) => [
        ...existing,
        ...accounts.filter((account) => !existing.some((item) => item.id === account.id)),
      ]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (requestGeneration === generation.current) {
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar mais pessoas.");
      }
    } finally {
      if (requestGeneration === generation.current) setIsLoading(false);
    }
  }

  return {
    users,
    nextCursor,
    isLoading,
    error,
    retry: () => setRetryVersion((version) => version + 1),
    loadMore,
  };
}
