import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./sessionConfig";

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashVerificationCode(accountId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`verify_email:${accountId}:${code}`)
    .digest("hex");
}

export function hashPasswordResetCode(accountId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`reset_password:${accountId}:${code}`)
    .digest("hex");
}

export function hashDeviceLoginCode(
  accountId: string,
  challengeId: string,
  code: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`device_login:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashPasswordUpdateCode(
  accountId: string,
  challengeId: string,
  code: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`password_update:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashAccountPasswordChangeCode(
  accountId: string,
  challengeId: string,
  code: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`account_password_change:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashAccountDeletionCode(
  accountId: string,
  challengeId: string,
  purpose: "account_deletion_request" | "account_deletion_restore",
  code: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`${purpose}:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashAccountEmailChangeCode(
  accountId: string,
  challengeId: string,
  purpose: "account_email_change_current" | "account_email_change_new",
  code: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`${purpose}:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
