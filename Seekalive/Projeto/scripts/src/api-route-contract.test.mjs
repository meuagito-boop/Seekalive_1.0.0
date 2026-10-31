import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertApiRouteInventoryMatchesContract,
  buildApiRouteInventory,
} from "./api-route-inventory.mjs";

const inventory = await buildApiRouteInventory();

test("mounted Express methods and paths exactly match the OpenAPI contract", () => {
  assert.deepEqual(inventory.diff, {
    duplicateRuntimeRoutes: [],
    missingFromContract: [],
    withoutRuntimeRoute: [],
    csrfContractMismatches: [],
  });
  assertApiRouteInventoryMatchesContract(inventory);
});

test("route-contract assertion fails on a synthetic mismatch", () => {
  assert.throws(
    () =>
      assertApiRouteInventoryMatchesContract({
        diff: {
          duplicateRuntimeRoutes: [],
          missingFromContract: [{ method: "GET", path: "/test" }],
          withoutRuntimeRoute: [],
          csrfContractMismatches: [],
        },
      }),
    /Express\/OpenAPI route drift: missingFromContract=1/,
  );
});
