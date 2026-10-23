export class EmailDeliveryUnavailableError extends Error {
  constructor() {
    super("Email verification delivery is not configured.");
    this.name = "EmailDeliveryUnavailableError";
  }
}

export type VerificationEmail = {
  email: string;
  displayName: string;
  code: string;
};

export interface AuthEmailDelivery {
  readonly isConfigured: boolean;
  sendVerificationCode(message: VerificationEmail): Promise<void>;
}

// Deliberately unavailable until an email provider is connected. No development
// code is returned in an API response or written to logs as a fallback.
export const authEmailDelivery: AuthEmailDelivery = {
  isConfigured: false,
  async sendVerificationCode() {
    throw new EmailDeliveryUnavailableError();
  },
};
