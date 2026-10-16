import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, currentUser as mockCurrentUser } from "../data/mockData";
import { getStoredActiveAccount, setStoredActiveAccount } from "../data/accountStorage";

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: () => void;
  registerAccount: (user: User) => void;
  updateAccount: (user: User) => void;
  logout: () => void;
  completeOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredActiveAccount() ?? mockCurrentUser);

  const login = () => {
    setIsAuthenticated(true);
    setCurrentUser(mockCurrentUser);
    setStoredActiveAccount(mockCurrentUser);
  };

  const registerAccount = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setStoredActiveAccount(user);
  };

  const updateAccount = (user: User) => {
    setCurrentUser(user);
    setStoredActiveAccount(user);
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
    <AppContext.Provider value={{ currentUser, isAuthenticated, login, registerAccount, updateAccount, logout, completeOnboarding }}>
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
