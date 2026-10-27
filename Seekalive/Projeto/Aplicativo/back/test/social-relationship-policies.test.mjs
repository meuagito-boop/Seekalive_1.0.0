import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAcceptFollowRequest,
  canCreateBlock,
  canStartFollow,
  decideFollowTransition,
} from "../src/modules/social/domain/relationshipPolicies.ts";

const eligible = {
  actorIsEligible: true,
  targetIsEligible: true,
  blocked: false,
};

test("following a private account creates a pending request", () => {
  assert.deepEqual(decideFollowTransition({
    ...eligible,
    targetIsPrivate: true,
    existingFollowAt: null,
    existingRequestAt: null,
  }), { kind: "create_request" });
});

test("following a public account creates an accepted edge", () => {
  assert.deepEqual(decideFollowTransition({
    ...eligible,
    targetIsPrivate: false,
    existingFollowAt: null,
    existingRequestAt: null,
  }), { kind: "create_follow" });
});

test("existing relationships remain idempotent and unavailable relationships stay hidden", () => {
  assert.deepEqual(decideFollowTransition({
    ...eligible,
    targetIsPrivate: true,
    existingFollowAt: "2026-10-27T00:00:00.000Z",
    existingRequestAt: null,
  }), { kind: "already_following", updatedAt: "2026-10-27T00:00:00.000Z" });
  assert.deepEqual(decideFollowTransition({
    ...eligible,
    targetIsPrivate: true,
    existingFollowAt: null,
    existingRequestAt: "2026-10-27T00:00:00.000Z",
  }), { kind: "request_pending", updatedAt: "2026-10-27T00:00:00.000Z" });
  assert.equal(canStartFollow({ ...eligible, blocked: true }), false);
  assert.equal(decideFollowTransition({
    ...eligible,
    actorIsEligible: false,
    targetIsPrivate: false,
    existingFollowAt: null,
    existingRequestAt: null,
  }).kind, "unavailable");
});

test("follow requests require eligible unblocked accounts and an existing request", () => {
  const allowed = {
    targetIsEligible: true,
    requesterIsEligible: true,
    blocked: false,
    requestExists: true,
  };
  assert.equal(canAcceptFollowRequest(allowed), true);
  assert.equal(canAcceptFollowRequest({ ...allowed, requestExists: false }), false);
  assert.equal(canAcceptFollowRequest({ ...allowed, blocked: true }), false);
});

test("blocking is allowed only when both accounts are eligible", () => {
  assert.equal(canCreateBlock({ actorIsEligible: true, targetIsEligible: true }), true);
  assert.equal(canCreateBlock({ actorIsEligible: false, targetIsEligible: true }), false);
  assert.equal(canCreateBlock({ actorIsEligible: true, targetIsEligible: false }), false);
});
