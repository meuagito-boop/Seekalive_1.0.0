import { useEffect, useState } from "react";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import { useAppContext } from "@/modules/app/state/AppContext";
import {
  accountListToUsers,
  socialGraphApi,
} from "@/modules/social/services/socialGraphApi";
import type { ConnectionListKind } from "@/modules/social/types/connectionList";
import type { User } from "@/modules/profile/types/user";

export function useConnectionList(kind: ConnectionListKind, username?: string) {
  const {
    users,
    toggleFollow,
    isRemoteSocialSession,
    loadRemoteProfile,
    upsertRemoteUser,
  } = useSocial();
  const { currentUser } = useAppContext();
  const [query, setQuery] = useState("");
  const [remoteAccounts, setRemoteAccounts] = useState<User[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const isMe = !!currentUser && username === currentUser.username;
  const owner = isMe
    ? currentUser
    : isRemoteSocialSession
      ? users.find(
          (user) => user.username === username && user.source === "server",
        )
      : users.find((user) => user.username === username);

  useEffect(() => {
    if (!isRemoteSocialSession || isMe || owner || !username) return;
    let active = true;
    void loadRemoteProfile(username)
      .then((loaded) => {
        if (active && !loaded)
          setError("O nome de usuário informado não é válido.");
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar o perfil.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    isRemoteSocialSession,
    isMe,
    owner?.id,
    username,
    retry,
    loadRemoteProfile,
  ]);

  useEffect(() => {
    if (!isRemoteSocialSession || !owner) return;
    let active = true;
    setRemoteAccounts([]);
    setNextCursor(null);
    setError(null);
    setLoading(true);
    const fetchPage =
      kind === "followers"
        ? socialGraphApi.getFollowers
        : socialGraphApi.getFollowing;
    void fetchPage(owner.id)
      .then((page) => {
        if (!active) return;
        const pageUsers = accountListToUsers(page.items);
        pageUsers.forEach(upsertRemoteUser);
        setRemoteAccounts(pageUsers);
        setNextCursor(page.nextCursor);
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Não foi possível carregar a lista.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isRemoteSocialSession, owner?.id, kind, retry, upsertRemoteUser]);

  const available = isRemoteSocialSession || (kind === "following" && isMe);
  const base = isRemoteSocialSession
    ? remoteAccounts.filter((user) => user.id !== owner?.id && !user.isBlocked)
    : available
      ? users.filter(
          (user) =>
            user.id !== owner?.id && !user.isBlocked && user.isFollowing,
        )
      : [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = base.filter(
    (user) =>
      user.displayName.toLowerCase().includes(normalizedQuery) ||
      user.username.toLowerCase().includes(normalizedQuery),
  );

  async function loadMore() {
    if (!isRemoteSocialSession || !owner || !nextCursor || loading) return;
    setLoading(true);
    setError(null);
    const fetchPage =
      kind === "followers"
        ? socialGraphApi.getFollowers
        : socialGraphApi.getFollowing;
    try {
      const page = await fetchPage(owner.id, nextCursor);
      const pageUsers = accountListToUsers(page.items);
      pageUsers.forEach(upsertRemoteUser);
      setRemoteAccounts((existing) => [
        ...existing,
        ...pageUsers.filter(
          (user) => !existing.some((item) => item.id === user.id),
        ),
      ]);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar mais contas.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    currentUser,
    owner,
    isRemoteSocialSession,
    available,
    query,
    setQuery,
    filteredUsers,
    remoteAccountCount: remoteAccounts.length,
    nextCursor,
    loading,
    error,
    retry: () => setRetry((value) => value + 1),
    loadMore,
    toggleFollow,
  };
}
