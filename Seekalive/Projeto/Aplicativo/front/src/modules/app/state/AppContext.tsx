import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@/modules/profile/types/user";
import { setStoredActiveAccount } from "@/modules/profile/data/accountStorage";
import { getCurrentSession, logoutAccount } from "@/modules/auth/services/sessionApi";
import type { AuthAccount } from "@/modules/auth/types";
import { resolveAuthSession } from "@/modules/auth/state/authSessionState";

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  sessionCheckUnavailable: boolean;
  retrySessionCheck: () => void;
  logoutError: string | null;
  clearLogoutError: () => void;
  isDevelopmentPreview: boolean;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  setAuthenticatedAccount: (account: AuthAccount) => void;
  startDevelopmentPreview: () => Promise<void>;
  updateAccount: (user: User) => void;
  logout: () => Promise<boolean>;
  clearLocalAuthentication: () => void;
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
  const [sessionCheckUnavailable, setSessionCheckUnavailable] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isDevelopmentPreview, setIsDevelopmentPreview] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsAuthLoading(true);
    setSessionCheckUnavailable(false);
    void resolveAuthSession(getCurrentSession)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "authenticated") {
          setCurrentUser(toUser(result.account));
        } else if (result.status === "signed_out") {
          setCurrentUser(null);
        } else {
          setSessionCheckUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionCheckAttempt]);

  const retrySessionCheck = () => {
    setSessionCheckUnavailable(false);
    setIsAuthLoading(true);
    setSessionCheckAttempt((attempt) => attempt + 1);
  };

  const clearLocalAuthentication = () => {
    setIsDevelopmentPreview(false);
    setCurrentUser(null);
    setLogoutError(null);
    setPendingVerificationEmail(null);
    setStoredActiveAccount(null);
  };

  const setAuthenticatedAccount = (account: AuthAccount) => {
    const user = toUser(account);
    setIsDevelopmentPreview(false);
    setLogoutError(null);
    setPendingVerificationEmail(null);
    setCurrentUser(user);
    // Authenticated profile data is reloaded from the API and should not be
    // resurrected from a stale browser snapshot.
    setStoredActiveAccount(null);
  };

  const startDevelopmentPreview = async () => {
    if (!import.meta.env.DEV) return;
    const { developmentPreviewUser: previewUser } = await import("@/data/demo/previewFixtures");
    setIsDevelopmentPreview(true);
    setLogoutError(null);
    setPendingVerificationEmail(null);
    setIsAuthLoading(false);
    setCurrentUser({ ...previewUser });
  };

  const updateAccount = (user: User) => {
    // Social profile refreshes omit auth-only fields such as onboarding state;
    // merge their fields so they cannot erase state established by login.
    setCurrentUser((current) => current?.id === user.id ? { ...current, ...user } : current);
  };

  const logout = async (): Promise<boolean> => {
    setLogoutError(null);
    if (isDevelopmentPreview) {
      clearLocalAuthentication();
      return true;
    }
    try {
      await logoutAccount();
      clearLocalAuthentication();
      return true;
    } catch {
      setLogoutError("Não foi possível encerrar a sessão no servidor. Sua conta continua aberta; tente novamente.");
      return false;
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
        sessionCheckUnavailable,
        retrySessionCheck,
        logoutError,
        clearLogoutError: () => setLogoutError(null),
        isDevelopmentPreview,
        pendingVerificationEmail,
        setPendingVerificationEmail,
        setAuthenticatedAccount,
        startDevelopmentPreview,
        updateAccount,
        logout,
        clearLocalAuthentication,
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
