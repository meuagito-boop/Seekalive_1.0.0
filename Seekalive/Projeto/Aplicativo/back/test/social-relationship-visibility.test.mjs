import assert from "node:assert/strict";
import { test } from "node:test";
import { canViewRelationshipList } from "../src/modules/social/domain/relationshipVisibility.ts";

function relationship(overrides = {}) {
  return {
    following: "none",
    inCircle: false,
    blockedByMe: false,
    blockedByThem: false,
    mutedByMe: false,
    ...overrides,
  };
}

test("public relationship lists are visible without authentication", () => {
  assert.equal(canViewRelationshipList(null, "target", false, relationship()), true);
  assert.equal(canViewRelationshipList(null, "target", true, relationship()), false);
});

test("private relationship lists require an accepted follow", () => {
  assert.equal(canViewRelationshipList("viewer", "target", true, relationship()), false);
  assert.equal(canViewRelationshipList(
    "viewer",
    "target",
    true,
    relationship({ following: "accepted" }),
  ), true);
});

test("a blocked relationship hides lists even for public accounts", () => {
  assert.equal(canViewRelationshipList(
    "viewer",
    "target",
    false,
    relationship({ blockedByMe: true }),
  ), false);
  assert.equal(canViewRelationshipList(
    "viewer",
    "target",
    false,
    relationship({ blockedByThem: true }),
  ), false);
});

test("account owners can view their own private relationship lists", () => {
  assert.equal(canViewRelationshipList("same-account", "same-account", true, relationship()), true);
});
