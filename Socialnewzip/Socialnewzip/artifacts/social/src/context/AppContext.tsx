import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, currentUser as mockCurrentUser } from "../data/mockData";

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  completeOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(mockCurrentUser);

  const login = () => {
    setIsAuthenticated(true);
    setCurrentUser(mockCurrentUser);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const completeOnboarding = () => {
    // any onboarding logic
  };

  return (
    <AppContext.Provider value={{ currentUser, isAuthenticated, login, logout, completeOnboarding }}>
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
