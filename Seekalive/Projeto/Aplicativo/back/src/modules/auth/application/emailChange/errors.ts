export class EmailAddressConflictError extends Error {
  constructor() {
    super("The email address is already in use.");
    this.name = "EmailAddressConflictError";
  }
}
