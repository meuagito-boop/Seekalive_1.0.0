import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAccountDeletionDeadline,
  canRestoreAccountDeletion,
  isAccountDeletionDue,
} from "../src/modules/accounts/domain/accountDeletionPolicy.ts";

const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;

test("account deletion deadline is exactly seven days after request", () => {
  const requestedAt = new Date("2026-10-29T12:00:00.000Z");

  assert.equal(
    calculateAccountDeletionDeadline(requestedAt).getTime(),
    requestedAt.getTime() + gracePeriodMs,
  );
});

test("restoration is allowed before, but not at or after, the deadline", () => {
  const scheduledFor = new Date("2026-11-05T12:00:00.000Z");

  assert.equal(
    canRestoreAccountDeletion(
      scheduledFor,
      new Date(scheduledFor.getTime() - 1),
    ),
    true,
  );
  assert.equal(canRestoreAccountDeletion(scheduledFor, scheduledFor), false);
  assert.equal(
    canRestoreAccountDeletion(
      scheduledFor,
      new Date(scheduledFor.getTime() + 1),
    ),
    false,
  );
});

test("finalization becomes due at the deadline", () => {
  const scheduledFor = new Date("2026-11-05T12:00:00.000Z");

  assert.equal(
    isAccountDeletionDue(scheduledFor, new Date(scheduledFor.getTime() - 1)),
    false,
  );
  assert.equal(isAccountDeletionDue(scheduledFor, scheduledFor), true);
});

test("invalid dates are rejected instead of treated as an active grace period", () => {
  const invalidDate = new Date(Number.NaN);

  assert.throws(
    () => calculateAccountDeletionDeadline(invalidDate),
    RangeError,
  );
  assert.throws(
    () => canRestoreAccountDeletion(invalidDate, new Date()),
    RangeError,
  );
  assert.throws(
    () => isAccountDeletionDue(new Date(), invalidDate),
    RangeError,
  );
});
