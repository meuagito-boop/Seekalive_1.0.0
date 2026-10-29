const ACCOUNT_DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function assertValidDate(value: Date, label: string): void {
  if (!Number.isFinite(value.getTime())) {
    throw new RangeError(`${label} must be a valid date.`);
  }
}

export function calculateAccountDeletionDeadline(requestedAt: Date): Date {
  assertValidDate(requestedAt, "requestedAt");
  return new Date(requestedAt.getTime() + ACCOUNT_DELETION_GRACE_PERIOD_MS);
}

export function canRestoreAccountDeletion(
  scheduledFor: Date,
  now: Date,
): boolean {
  assertValidDate(scheduledFor, "scheduledFor");
  assertValidDate(now, "now");
  return now.getTime() < scheduledFor.getTime();
}

export function isAccountDeletionDue(scheduledFor: Date, now: Date): boolean {
  assertValidDate(scheduledFor, "scheduledFor");
  assertValidDate(now, "now");
  return now.getTime() >= scheduledFor.getTime();
}
