import type { CurrentSession } from "../services/authApi";

export type AuthSessionResolution =
  | { status: "authenticated"; account: Extract<CurrentSession, { authenticated: true }>["account"] }
  | { status: "signed_out" }
  | { status: "unavailable" };

export async function resolveAuthSession(
  loadSession: () => Promise<CurrentSession>,
): Promise<AuthSessionResolution> {
  try {
    const session = await loadSession();
    return session.authenticated
      ? { status: "authenticated", account: session.account }
      : { status: "signed_out" };
  } catch {
    return { status: "unavailable" };
  }
}
