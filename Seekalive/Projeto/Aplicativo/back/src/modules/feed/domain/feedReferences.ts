export class FeedReferencedPostUnavailableError extends Error {
  constructor() {
    super("The referenced publication is not available to this account.");
    this.name = "FeedReferencedPostUnavailableError";
  }
}
