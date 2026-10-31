export class FeedMediaAssetsUnavailableError extends Error {
  constructor() {
    super("One or more media uploads are missing, expired, or unavailable.");
    this.name = "FeedMediaAssetsUnavailableError";
  }
}
