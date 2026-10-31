import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApiRouteInventory } from "./api-route-inventory.mjs";

const inventory = await buildApiRouteInventory();

test("mounted Express methods and paths exactly match the OpenAPI contract", () => {
  assert.deepEqual(inventory.diff, {
    duplicateRuntimeRoutes: [],
    missingFromContract: [],
    withoutRuntimeRoute: [],
    csrfContractMismatches: [],
  });
});
