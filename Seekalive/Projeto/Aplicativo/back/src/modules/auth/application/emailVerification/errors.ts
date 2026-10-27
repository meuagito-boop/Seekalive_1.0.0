export class VerificationAlreadyConsumedError extends Error {
  constructor() {
    super("Email verification was already consumed.");
    this.name = "VerificationAlreadyConsumedError";
  }
}

export class VerificationDeliveryUnavailableError extends Error {
  constructor() {
    super("Email verification delivery is not configured.");
    this.name = "VerificationDeliveryUnavailableError";
  }
}
