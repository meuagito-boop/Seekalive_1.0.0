import assert from "node:assert/strict";
import { test } from "node:test";
import { createOnboardingCompleter } from "../src/modules/onboarding/application/completeOnboarding.ts";

test("onboarding completion persists the selected interests and returns their count", async () => {
  const persisted = [];
  const completeOnboarding = createOnboardingCompleter(
    async (accountId, interests, completedAt) => {
      persisted.push({ accountId, interests, completedAt });
    },
  );

  const interestCount = await completeOnboarding("account-1", {
    interests: ["cafes", "gastronomia"],
    skipped: false,
  });

  assert.equal(interestCount, 2);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].accountId, "account-1");
  assert.deepEqual(persisted[0].interests, ["cafes", "gastronomia"]);
  assert.ok(persisted[0].completedAt instanceof Date);
});

test("skipping onboarding persists no interests and still completes the step", async () => {
  const persisted = [];
  const completeOnboarding = createOnboardingCompleter(
    async (accountId, interests, completedAt) => {
      persisted.push({ accountId, interests, completedAt });
    },
  );

  const interestCount = await completeOnboarding("account-2", {
    interests: [],
    skipped: true,
  });

  assert.equal(interestCount, 0);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].accountId, "account-2");
  assert.deepEqual(persisted[0].interests, []);
  assert.ok(persisted[0].completedAt instanceof Date);
});

test("persistence failures propagate instead of reporting onboarding completion", async () => {
  const persistenceError = new Error("onboarding persistence failed");
  const completeOnboarding = createOnboardingCompleter(async () => {
    throw persistenceError;
  });

  await assert.rejects(
    completeOnboarding("account-3", {
      interests: ["cafes"],
      skipped: false,
    }),
    persistenceError,
  );
});
