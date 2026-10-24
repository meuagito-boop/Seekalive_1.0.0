import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "../data/mockData";
import { setStoredActiveAccount } from "../data/accountStorage";
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
    // Authenticated profile data is reloaded from the API and should not be
    // resurrected from a stale browser snapshot.
    setStoredActiveAccount(null);
  };

  const startDevelopmentPreview = async () => {
    if (!import.meta.env.DEV) return;
    const { currentUser: previewUser } = await import("../data/mockData");
    setIsDevelopmentPreview(true);
    setIsAuthLoading(false);
    setCurrentUser({ ...previewUser });
  };

  const updateAccount = (user: User) => {
    // Social profile refreshes omit auth-only fields such as onboarding state;
    // merge their fields so they cannot erase state established by login.
    setCurrentUser((current) => current?.id === user.id ? { ...current, ...user } : current);
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
