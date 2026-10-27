import assert from "node:assert/strict";
import test from "node:test";
import { mapAuthorPostCounts } from "../src/modules/feed/application/postCountMapping.ts";

test("profile post counts include every author and default to zero when none exist", () => {
  const counts = mapAuthorPostCounts(
    ["account-a", "account-b", "account-a"],
    [{ authorId: "account-a", total: 3 }],
  );

  assert.deepEqual([...counts], [
    ["account-a", 3],
    ["account-b", 0],
  ]);
});

test("post count mapping ignores rows outside the requested account set", () => {
  const counts = mapAuthorPostCounts(
    ["account-a"],
    [
      { authorId: "account-a", total: 2 },
      { authorId: "account-unrequested", total: 99 },
    ],
  );

  assert.deepEqual([...counts], [["account-a", 2]]);
});

test("post count mapping returns an empty result for an empty account list", () => {
  assert.deepEqual([...mapAuthorPostCounts([], [{ authorId: "account-a", total: 1 }])], []);
});
