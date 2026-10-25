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

export type DeviceVerificationRequired = {
  status: "device_verification_required";
  challengeId: string;
  emailMasked: string;
  expiresAt: string;
  resendAvailableAt: string;
  message: string;
};

export type PasswordUpdateVerificationRequired = {
  status: "password_update_verification_required";
  challengeId: string;
  emailMasked: string;
  expiresAt: string;
  message: string;
};

export type LoginResult = AuthResult | DeviceVerificationRequired;

export type EmailConfirmationResult =
  | AuthResult
  | { emailVerified: true; passwordUpdateRequired: true; message: string };

export type CurrentSession =
  | { authenticated: false; account: null; session: null }
  | { authenticated: true; account: AuthAccount; session: { id: string; createdAt: string; expiresAt: string } };

export type AuthSessionView = {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type AuthSessionPage = {
  items: AuthSessionView[];
  nextCursor: string | null;
};

export type TrustedDeviceView = {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

export type TrustedDevicePage = {
  items: TrustedDeviceView[];
  hasMore: boolean;
};

export type AccountChangeCodeResponse = {
  status:
    | "current_email_verification_required"
    | "new_email_verification_required"
    | "password_change_verification_required";
  challengeId: string;
  emailMasked?: string;
  currentEmailMasked?: string;
  newEmailMasked?: string;
  expiresAt: string;
  message: string;
};

export type AccountEmailChangeResult = {
  status: "email_changed";
  email: string;
  securityNoticeSent: boolean;
};

export type AccountPasswordChangeResult = {
  status: "password_changed";
};

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
