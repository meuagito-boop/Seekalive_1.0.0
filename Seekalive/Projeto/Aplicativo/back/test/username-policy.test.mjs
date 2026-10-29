import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCOUNT_IDENTITY_COOLDOWN_MS,
  ACCOUNT_IDENTITY_COOLDOWN_DAYS,
  USERNAME_RESERVATION_DAYS,
  USERNAME_RESERVATION_MS,
  nextIdentityChangeAt,
} from "../src/modules/accounts/domain/usernamePolicy.ts";
import {
  isSeekaliveReservedUsername,
  usernameFormatSchema,
} from "../../../shared/contracts/src/username.ts";

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
    nextIdentityChangeAt(
      lastChangedAt,
      new Date("2026-01-01T00:00:00.000Z"),
    ).toISOString(),
    "2026-04-14T08:00:00.000Z",
  );
  assert.equal(USERNAME_RESERVATION_DAYS, 30);
  assert.equal(USERNAME_RESERVATION_MS, 30 * 24 * 60 * 60 * 1000);
});

test("username format accepts hyphen and keeps the account handle ASCII-only", () => {
  assert.equal(usernameFormatSchema.parse(" Ana-Silva_18 "), "ana-silva_18");
  for (const username of ["ab", "ana.silva", "ana silva", "ána_silva"]) {
    assert.equal(usernameFormatSchema.safeParse(username).success, false);
  }
});

test("every separator placement in the Seekalive spelling is reserved", () => {
  const brand = "seekalive";
  for (
    let separatorMask = 0;
    separatorMask < 2 ** (brand.length - 1);
    separatorMask += 1
  ) {
    let candidate = brand.charAt(0);
    for (let index = 1; index < brand.length; index += 1) {
      const separator = separatorMask & (1 << (index - 1)) ? "-" : "_";
      candidate += `${separator}${brand.charAt(index)}`;
    }
    assert.equal(isSeekaliveReservedUsername(candidate), true, candidate);
  }
});

test("reserved username checking covers numeric and common leetspeak variants", () => {
  const candidates = [
    "seekalive",
    "my_seek-alive_2026",
    "s33k4l1v3",
    "s5eekalive",
    "seekal1ve",
    "seekalive_support",
  ];
  for (const candidate of candidates) {
    assert.equal(isSeekaliveReservedUsername(candidate), true, candidate);
  }

  const numericInsertions = Array.from(
    { length: "seekalive".length - 1 },
    (_, index) =>
      `seekalive`.slice(0, index + 1) + "7" + `seekalive`.slice(index + 1),
  );
  assert.ok(numericInsertions.every(isSeekaliveReservedUsername));
});
