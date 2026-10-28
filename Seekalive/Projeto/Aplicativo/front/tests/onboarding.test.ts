import assert from "node:assert/strict";
import test from "node:test";
import { completeOnboarding } from "@/modules/onboarding/application/completeOnboarding";
import type { User } from "@/modules/profile/types/user";

const account: User = {
  id: "account-1",
  username: "ana",
  displayName: "Ana",
  bio: "",
  avatarUrl: "",
  coverUrl: "",
  joinedAt: "2026-01-01T00:00:00.000Z",
  accountType: "personal",
  onboardingCompleted: false,
  interests: [],
  stats: { posts: 0, followers: 0, following: 0, circles: 0 },
};

test("remote onboarding persists before updating account and social state", async () => {
  const events: string[] = [];
  let payload: { interests: string[]; skipped: boolean } | undefined;
  let updatedAccount: User | undefined;
  let updatedSocialAccount: User | undefined;

  const result = await completeOnboarding({
    account,
    interests: ["Gastronomia", "Arte"],
    skipped: false,
    isDevelopmentPreview: false,
    async saveRemote(value) {
      events.push("save");
      payload = value;
    },
    updateAccount(value) {
      events.push("account");
      updatedAccount = value;
    },
    updateSocialAccount(value) {
      events.push("social");
      updatedSocialAccount = value;
    },
  });

  assert.deepEqual(events, ["save", "account", "social"]);
  assert.deepEqual(payload, {
    interests: ["Gastronomia", "Arte"],
    skipped: false,
  });
  assert.deepEqual(result.interests, ["Gastronomia", "Arte"]);
  assert.equal(result.onboardingCompleted, true);
  assert.equal(updatedAccount, result);
  assert.equal(updatedSocialAccount, result);
});

test("skipping sends an empty interest list to the remote service", async () => {
  let payload: { interests: string[]; skipped: boolean } | undefined;

  await completeOnboarding({
    account,
    interests: ["Gastronomia"],
    skipped: true,
    isDevelopmentPreview: false,
    async saveRemote(value) {
      payload = value;
    },
    updateAccount() {},
    updateSocialAccount() {},
  });

  assert.deepEqual(payload, { interests: [], skipped: true });
});

test("development preview updates local account state without remote or social writes", async () => {
  const events: string[] = [];

  const result = await completeOnboarding({
    account,
    interests: ["Música"],
    skipped: false,
    isDevelopmentPreview: true,
    async saveRemote() {
      events.push("remote");
    },
    updateAccount() {
      events.push("account");
    },
    updateSocialAccount() {
      events.push("social");
    },
  });

  assert.deepEqual(events, ["account"]);
  assert.deepEqual(result.interests, ["Música"]);
  assert.equal(result.onboardingCompleted, true);
});

test("a remote persistence failure does not update local account projections", async () => {
  const events: string[] = [];

  await assert.rejects(
    completeOnboarding({
      account,
      interests: ["Arte"],
      skipped: false,
      isDevelopmentPreview: false,
      async saveRemote() {
        events.push("remote");
        throw new Error("persistence failed");
      },
      updateAccount() {
        events.push("account");
      },
      updateSocialAccount() {
        events.push("social");
      },
    }),
    /persistence failed/,
  );

  assert.deepEqual(events, ["remote"]);
});
