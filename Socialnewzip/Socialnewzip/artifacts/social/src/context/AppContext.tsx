import React, { createContext, useContext, useState, ReactNode } from "react";
import { User } from "../data/mockData";
import { getStoredActiveAccount, saveSocialAccount, setStoredActiveAccount } from "../data/accountStorage";

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  registerAccount: (user: User) => void;
  updateAccount: (user: User) => void;
  logout: () => void;
  completeOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredActiveAccount());
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getStoredActiveAccount()));

  const registerAccount = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setStoredActiveAccount(user);
  };

  const updateAccount = (user: User) => {
    setCurrentUser(user);
    setStoredActiveAccount(user);
    saveSocialAccount(user);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setStoredActiveAccount(null);
  };

  const completeOnboarding = () => {
    // any onboarding logic
  };

  return (
    <AppContext.Provider value={{ currentUser, isAuthenticated, registerAccount, updateAccount, logout, completeOnboarding }}>
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
