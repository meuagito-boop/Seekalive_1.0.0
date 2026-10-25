import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCOUNT_IDENTITY_COOLDOWN_MS,
  ACCOUNT_IDENTITY_COOLDOWN_DAYS,
  USERNAME_RESERVATION_DAYS,
  USERNAME_RESERVATION_MS,
  nextIdentityChangeAt,
} from "../src/modules/accounts/application/usernamePolicy.ts";

test("name and username first changes are allowed 30 days after registration", () => {
  const createdAt = new Date("2026-01-01T12:34:56.000Z");

  assert.equal(ACCOUNT_IDENTITY_COOLDOWN_DAYS, 30);
  assert.equal(ACCOUNT_IDENTITY_COOLDOWN_MS, 30 * 24 * 60 * 60 * 1000);
  assert.equal(
    nextIdentityChangeAt(null, createdAt).toISOString(),
    "2026-01-31T12:34:56.000Z",
  );
});

test("each later name or username change starts a new 30-day cooldown", () => {
  const lastChangedAt = new Date("2026-03-15T08:00:00.000Z");

  assert.equal(
    nextIdentityChangeAt(lastChangedAt, new Date("2026-01-01T00:00:00.000Z")).toISOString(),
    "2026-04-14T08:00:00.000Z",
  );
  assert.equal(USERNAME_RESERVATION_DAYS, 30);
  assert.equal(USERNAME_RESERVATION_MS, 30 * 24 * 60 * 60 * 1000);
});
