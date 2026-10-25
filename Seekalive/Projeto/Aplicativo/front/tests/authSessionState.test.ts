import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthSession } from "@/modules/app/state/authSessionState";

test("auth session resolution distinguishes an unavailable API from a signed-out session", async () => {
  const unavailable = await resolveAuthSession(async () => {
    throw new Error("network unavailable");
  });
  const signedOut = await resolveAuthSession(async () => ({
    authenticated: false,
    account: null,
    session: null,
  }));

  assert.deepEqual(unavailable, { status: "unavailable" });
  assert.deepEqual(signedOut, { status: "signed_out" });
});

test("auth session resolution preserves the authenticated account", async () => {
  const account = {
    id: "account-1",
    username: "ana",
    displayName: "Ana Silva",
    accountType: "personal" as const,
    joinedAt: "2026-01-01T00:00:00.000Z",
    onboardingCompleted: true,
  };

  const result = await resolveAuthSession(async () => ({
    authenticated: true,
    account,
    session: {
      id: "session-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-02T00:00:00.000Z",
    },
  }));

  assert.deepEqual(result, { status: "authenticated", account });
});
