import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const sourceFiles = {
  application: new URL(
    "../src/modules/onboarding/application/completeOnboarding.ts",
    import.meta.url,
  ),
  ports: new URL(
    "../src/modules/onboarding/application/ports.ts",
    import.meta.url,
  ),
  presentation: new URL(
    "../src/modules/onboarding/presentation/routes.ts",
    import.meta.url,
  ),
  infrastructure: new URL(
    "../src/modules/onboarding/infrastructure/onboardingRepository.ts",
    import.meta.url,
  ),
  composition: new URL(
    "../src/modules/onboarding/composition/router.ts",
    import.meta.url,
  ),
  entrypoint: new URL("../src/modules/index.ts", import.meta.url),
};

test("Onboarding composes application ports, presentation, and transactional persistence", async () => {
  const sources = Object.fromEntries(
    await Promise.all(
      Object.entries(sourceFiles).map(async ([layer, file]) => [
        layer,
        await readFile(file, "utf8"),
      ]),
    ),
  );

  assert.doesNotMatch(
    sources.application,
    /@workspace\/db|drizzle-orm|\.\.\/(infrastructure|presentation|composition)\//,
  );
  assert.doesNotMatch(sources.presentation, /@workspace\/db|drizzle-orm/);
  assert.match(sources.application, /createOnboardingCompleter/);
  assert.match(sources.application, /from "\.\/ports"/);
  assert.match(sources.ports, /PersistOnboardingCompletion/);
  assert.match(sources.presentation, /import type \{ CompleteOnboarding \}/);
  assert.doesNotMatch(sources.presentation, /import \{ completeOnboarding \}/);
  assert.match(sources.presentation, /createOnboardingRouter/);
  assert.match(sources.infrastructure, /@workspace\/db/);
  assert.match(sources.infrastructure, /db\.transaction/);
  assert.match(sources.infrastructure, /delete\(accountInterests\)/);
  assert.match(sources.infrastructure, /insert\(accountInterests\)/);
  assert.match(sources.infrastructure, /update\(accounts\)/);
  assert.match(sources.composition, /createOnboardingCompleter/);
  assert.match(sources.composition, /persistOnboardingCompletion/);
  assert.match(sources.composition, /createOnboardingRouter/);
  assert.match(sources.entrypoint, /onboarding\/composition\/router/);
});
