import assert from "node:assert/strict";
import test from "node:test";
import {
  appendUniqueRemoteFeedItems,
  getRemoteFeedViewState,
} from "../src/modules/social/application/remoteFeedState";

test("remote feed does not show an empty state before its selected tab loads", () => {
  assert.equal(
    getRemoteFeedViewState({
      isRemoteSession: true,
      activeTab: 2,
      loadedTab: 0,
      loading: false,
      error: null,
      itemCount: 0,
    }),
    "loading",
  );
});

test("remote feed distinguishes loading, error, empty, and visible content", () => {
  const input = {
    isRemoteSession: true,
    activeTab: 1,
    loadedTab: 1,
    loading: true,
    error: null as string | null,
    itemCount: 0,
  };

  assert.equal(getRemoteFeedViewState(input), "loading");
  assert.equal(
    getRemoteFeedViewState({ ...input, loading: false, error: "Falha" }),
    "error",
  );
  assert.equal(
    getRemoteFeedViewState({ ...input, loading: false, error: null }),
    "empty",
  );
  assert.equal(
    getRemoteFeedViewState({
      ...input,
      loading: false,
      error: "Falha ao carregar a próxima página",
      itemCount: 1,
    }),
    "content",
  );
});

test("local preview does not use the remote loading state", () => {
  assert.equal(
    getRemoteFeedViewState({
      isRemoteSession: false,
      activeTab: 0,
      loadedTab: 0,
      loading: true,
      error: null,
      itemCount: 0,
    }),
    "local",
  );
});

test("remote feed pagination preserves order and removes duplicate post ids", () => {
  const first = { post: { id: "post-1" } };
  const second = { post: { id: "post-2" } };
  const third = { post: { id: "post-3" } };

  assert.deepEqual(
    appendUniqueRemoteFeedItems([first, second], [second, third]),
    [first, second, third],
  );
  assert.deepEqual(appendUniqueRemoteFeedItems([first], [first]), [first]);
});
