import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../data/mockData";
import { getStoredActiveAccount, saveSocialAccount, setStoredActiveAccount } from "../data/accountStorage";
import { getCurrentSession, logoutAccount, type AuthAccount } from "../services/authApi";

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isDevelopmentPreview: boolean;
  setAuthenticatedAccount: (account: AuthAccount) => void;
  startDevelopmentPreview: () => Promise<void>;
  updateAccount: (user: User) => void;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function toUser(account: AuthAccount): User {
  const storedProfile = getStoredActiveAccount();
  if (storedProfile?.id === account.id) {
    return {
      ...storedProfile,
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      accountType: account.accountType,
      joinedAt: account.joinedAt,
      onboardingCompleted: account.onboardingCompleted,
    };
  }

  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    bio: "",
    avatarUrl: "",
    coverUrl: "",
    joinedAt: account.joinedAt,
    accountType: account.accountType,
    interests: [],
    onboardingCompleted: account.onboardingCompleted,
    stats: { posts: 0, followers: 0, following: 0, circles: 0 },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDevelopmentPreview, setIsDevelopmentPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentSession()
      .then((session) => {
        if (cancelled) return;
        setCurrentUser(session.authenticated ? toUser(session.account) : null);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthenticatedAccount = (account: AuthAccount) => {
    const user = toUser(account);
    setIsDevelopmentPreview(false);
    setCurrentUser(user);
    setStoredActiveAccount(user);
  };

  const startDevelopmentPreview = async () => {
    if (!import.meta.env.DEV) return;
    const { currentUser: previewUser } = await import("../data/mockData");
    setIsDevelopmentPreview(true);
    setIsAuthLoading(false);
    setCurrentUser({ ...previewUser });
  };

  const updateAccount = (user: User) => {
    setCurrentUser((current) => current?.id === user.id ? user : current);
    if (currentUser?.id === user.id && !isDevelopmentPreview) {
      setStoredActiveAccount(user);
      saveSocialAccount(user);
    }
  };

  const logout = async () => {
    if (isDevelopmentPreview) {
      setIsDevelopmentPreview(false);
      setCurrentUser(null);
      return;
    }
    try {
      await logoutAccount();
    } catch {
      // The local UI still closes; the server session remains authoritative on reload.
    } finally {
      setCurrentUser(null);
      setStoredActiveAccount(null);
    }
  };

  const completeOnboarding = () => {
    setCurrentUser((current) => current ? { ...current, onboardingCompleted: true } : current);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        isAuthLoading,
        isDevelopmentPreview,
        setAuthenticatedAccount,
        startDevelopmentPreview,
        updateAccount,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
