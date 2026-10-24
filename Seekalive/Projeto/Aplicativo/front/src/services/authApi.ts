export type AuthAccount = {
  id: string;
  username: string;
  displayName: string;
  accountType: "personal" | "commercial";
  joinedAt: string;
  onboardingCompleted: boolean;
};

export type AuthResult = {
  account: AuthAccount;
  session: { id: string; createdAt: string; expiresAt: string };
  csrfToken: string;
  emailVerified: true;
};

export type EmailConfirmationResult =
  | AuthResult
  | { emailVerified: true; passwordUpdateRequired: true; message: string };

export type CurrentSession =
  | { authenticated: false; account: null; session: null }
  | { authenticated: true; account: AuthAccount; session: { id: string; createdAt: string; expiresAt: string } };

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (payload as ApiErrorPayload | undefined)?.error;
    throw new AuthApiError(
      error?.message ?? "Não foi possível concluir a solicitação.",
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.details ?? [],
    );
  }
  return payload as T;
}

export async function getCurrentSession(): Promise<CurrentSession> {
  const response = await fetch("/api/v1/auth/session", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseResponse<CurrentSession>(response);
}

export async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/v1/auth/csrf", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await parseResponse<{ csrfToken: string }>(response);
  return payload.csrfToken;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`/api/v1${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: body === undefined ? "{}" : JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export type PersonalRegistration = {
  accountType: "personal";
  firstName: string;
  lastName: string;
  age: number;
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedTermsVersion: string;
};

export type CommercialRegistration = {
  accountType: "commercial";
  businessName: string;
  age: number;
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  categoryKey: string;
  discoveryKind: "place" | "provider";
  address: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  acceptedTermsVersion: string;
};

export type Registration = PersonalRegistration | CommercialRegistration;

export function registerAccount(payload: Registration) {
  return postJson<{ status: "verification_required"; message: string }>("/auth/register", payload);
}

export function loginAccount(payload: { identifier: string; password: string }) {
  return postJson<AuthResult>("/auth/login", payload);
}

export function confirmEmail(payload: { email: string; code: string }) {
  return postJson<EmailConfirmationResult>("/auth/verification/confirm", payload);
}

export function updatePasswordPolicy(payload: {
  identifier: string;
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
}) {
  return postJson<{ status: "password_updated" }>("/auth/password/update", payload);
}

export function requestPasswordReset(payload: { email: string }) {
  return postJson<{ status: "reset_requested"; message: string }>("/auth/password/reset/request", payload);
}

export function confirmPasswordReset(payload: {
  email: string;
  code: string;
  newPassword: string;
  passwordConfirmation: string;
}) {
  return postJson<{ status: "password_reset" }>("/auth/password/reset/confirm", payload);
}

export function resendVerification(payload: { email: string }) {
  return postJson<{ status: "verification_required"; message: string }>("/auth/verification", payload);
}

export function completeOnboarding(payload: { interests: string[]; skipped: boolean }) {
  return postJson<{ onboardingCompleted: true; interestCount: number }>("/onboarding/interests", payload);
}

export async function logoutAccount(): Promise<void> {
  await postJson<void>("/auth/logout");
}
