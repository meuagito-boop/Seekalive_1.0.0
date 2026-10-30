import assert from "node:assert/strict";
import { test } from "node:test";
import { createCommercialProfileDetailsReader } from "../src/modules/seek/application/commercialProfileDetails.ts";

const record = {
  categoryKey: "cafes",
  discoveryKind: "place",
  address: "Rua de Teste, 100",
  postalCode: "01001000",
  cityName: "São Paulo",
  stateName: "SP",
  countryName: "Brasil",
};

test("Seek reader maps persisted commercial details to its public contract", async () => {
  const read = createCommercialProfileDetailsReader(async () => record);
  assert.deepEqual(await read("account-id"), record);
});

test("Seek reader reports a missing commercial profile without inventing data", async () => {
  const read = createCommercialProfileDetailsReader(async () => null);
  assert.equal(await read("missing-account"), null);
});

test("Seek reader rejects unsupported discovery kinds and incomplete records", async () => {
  const invalidKind = createCommercialProfileDetailsReader(async () => ({
    ...record,
    discoveryKind: "unknown",
  }));
  const incomplete = createCommercialProfileDetailsReader(async () => ({
    ...record,
    address: "   ",
  }));

  await assert.rejects(invalidKind("account-id"), /unsupported discovery kind/);
  await assert.rejects(
    incomplete("account-id"),
    /missing required public details/,
  );
});
