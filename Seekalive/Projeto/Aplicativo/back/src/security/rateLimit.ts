import type { RequestHandler } from "express";
import { getTrustedClientIp } from "./trustedClientIp";

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function createAuthRateLimit(
  name: string,
  maxRequests: number,
  windowMs: number,
): RequestHandler {
  return (request, response, next) => {
    const now = Date.now();
    const key = `${name}:${getTrustedClientIp(request) ?? request.ip ?? "unknown"}`;
    let bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitBuckets.set(key, bucket);
    }
    bucket.count += 1;

    if (rateLimitBuckets.size > 10_000) {
      for (const [bucketKey, value] of rateLimitBuckets) {
        if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
      }
    }
    if (bucket.count > maxRequests) {
      response.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      response.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Muitas tentativas. Aguarde e tente novamente.",
          requestId: response.locals.requestId ?? "unknown",
        },
      });
      return;
    }
    next();
  };
}
