import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const sourceFiles = {
  application: new URL("../src/modules/onboarding/application/completeOnboarding.ts", import.meta.url),
  presentation: new URL("../src/modules/onboarding/presentation/routes.ts", import.meta.url),
  infrastructure: new URL("../src/modules/onboarding/infrastructure/onboardingRepository.ts", import.meta.url),
};

test("Onboarding persistence is transactional and isolated in infrastructure", async () => {
  const sources = Object.fromEntries(await Promise.all(
    Object.entries(sourceFiles).map(async ([layer, file]) => [layer, await readFile(file, "utf8")]),
  ));

  assert.doesNotMatch(sources.application, /@workspace\/db|drizzle-orm/);
  assert.doesNotMatch(sources.presentation, /@workspace\/db|drizzle-orm/);
  assert.match(sources.application, /persistOnboardingCompletion/);
  assert.match(sources.infrastructure, /@workspace\/db/);
  assert.match(sources.infrastructure, /db\.transaction/);
  assert.match(sources.infrastructure, /delete\(accountInterests\)/);
  assert.match(sources.infrastructure, /insert\(accountInterests\)/);
  assert.match(sources.infrastructure, /update\(accounts\)/);
});
