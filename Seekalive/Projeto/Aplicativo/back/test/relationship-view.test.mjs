import assert from "node:assert/strict";
import test from "node:test";
import { buildRelationshipView } from "../src/modules/social/application/relationshipView.ts";

test("new or anonymous relationship has no follow or circle", () => {
  assert.deepEqual(buildRelationshipView({
    acceptedFollow: false,
    pendingRequest: false,
    reciprocalFollow: false,
    blockedByMe: false,
    blockedByThem: false,
  }), {
    following: "none",
    inCircle: false,
    blockedByMe: false,
    blockedByThem: false,
    mutedByMe: false,
  });
});

test("a pending request is not an accepted follow or a circle", () => {
  const relationship = buildRelationshipView({
    acceptedFollow: false,
    pendingRequest: true,
    reciprocalFollow: true,
    blockedByMe: false,
    blockedByThem: false,
  });

  assert.equal(relationship.following, "pending");
  assert.equal(relationship.inCircle, false);
});

test("circle requires accepted follows in both directions", () => {
  assert.equal(buildRelationshipView({
    acceptedFollow: true,
    pendingRequest: false,
    reciprocalFollow: false,
    blockedByMe: false,
    blockedByThem: false,
  }).inCircle, false);

  assert.equal(buildRelationshipView({
    acceptedFollow: true,
    pendingRequest: false,
    reciprocalFollow: true,
    blockedByMe: false,
    blockedByThem: false,
  }).inCircle, true);
});
