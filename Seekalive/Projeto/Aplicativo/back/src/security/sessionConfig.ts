export const SESSION_COOKIE = "__Host-seekalive_session";
export const PRE_AUTH_COOKIE = "__Host-seekalive_pre_auth";
export const DEVICE_COOKIE = "__Host-seekalive_device";
export const DEVICE_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

const configuredSecret = process.env.SESSION_SECRET ?? "";
if (Buffer.byteLength(configuredSecret) < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 bytes for authentication.");
}
export const sessionSecret = configuredSecret;

const configuredTtl = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);
if (!Number.isInteger(configuredTtl) || configuredTtl < 60 || configuredTtl > 60 * 60 * 24 * 30) {
  throw new Error("SESSION_TTL_SECONDS must be between 60 seconds and 30 days.");
}
export const SESSION_TTL_SECONDS = configuredTtl;
