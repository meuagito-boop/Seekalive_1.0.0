export type VerificationEmail = {
  email: string;
  displayName: string;
  code: string;
};

export type PasswordResetEmail = {
  email: string;
  code: string;
};

export type DeviceLoginEmail = {
  email: string;
  displayName: string;
  code: string;
};

export type PasswordUpdateEmail = {
  email: string;
  displayName: string;
  code: string;
};

export type AccountEmailChangeSecurityNotice = {
  email: string;
  displayName: string;
  newEmailMasked: string;
};

export interface AuthEmailDelivery {
  readonly isConfigured: boolean;
  sendVerificationCode(message: VerificationEmail): Promise<void>;
  sendPasswordResetCode(message: PasswordResetEmail): Promise<void>;
  sendDeviceLoginCode(message: DeviceLoginEmail): Promise<void>;
  sendPasswordUpdateCode(message: PasswordUpdateEmail): Promise<void>;
  sendAccountPasswordChangeCode(message: PasswordUpdateEmail): Promise<void>;
  sendAccountEmailChangeCurrentCode(
    message: PasswordUpdateEmail,
  ): Promise<void>;
  sendAccountEmailChangeNewCode(message: PasswordUpdateEmail): Promise<void>;
  sendAccountEmailChangeSecurityNotice(
    message: AccountEmailChangeSecurityNotice,
  ): Promise<void>;
}
