import type { User } from "./mockData";

const ACCOUNTS_KEY = "seekalive-social-accounts";
const ACTIVE_ACCOUNT_KEY = "seekalive-active-account";

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<User>;
  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    typeof user.displayName === "string" &&
    typeof user.accountType === "string" &&
    (user.accountType === "personal" || user.accountType === "commercial")
  );
}

export function getStoredAccounts(): User[] {
  if (typeof window === "undefined") return [];

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isUser) : [];
  } catch {
    console.warn("Could not read saved Social accounts from this browser.");
    return [];
  }
}

export function saveSocialAccount(account: User) {
  if (typeof window === "undefined") return;

  try {
    const accounts = getStoredAccounts().filter((saved) => saved.id !== account.id);
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  } catch {
    console.warn("Could not save this Social account in this browser.");
  }
}

export function getStoredActiveAccount(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(ACTIVE_ACCOUNT_KEY) ?? "null");
    return isUser(value) ? value : null;
  } catch {
    console.warn("Could not read the active Social account from this browser.");
    return null;
  }
}

export function setStoredActiveAccount(account: User | null) {
  if (typeof window === "undefined") return;

  try {
    if (account) {
      window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(account));
    } else {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  } catch {
    console.warn("Could not save the active Social account in this browser.");
  }
}
