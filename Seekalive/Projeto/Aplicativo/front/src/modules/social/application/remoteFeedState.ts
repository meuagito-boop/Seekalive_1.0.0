export type RemoteFeedViewState =
  | "local"
  | "loading"
  | "error"
  | "empty"
  | "content";

export function getRemoteFeedViewState(input: {
  isRemoteSession: boolean;
  activeTab: number;
  loadedTab: number;
  loading: boolean;
  error: string | null;
  itemCount: number;
}): RemoteFeedViewState {
  if (!input.isRemoteSession) return "local";
  if (
    input.activeTab !== input.loadedTab ||
    (input.loading && input.itemCount === 0)
  ) {
    return "loading";
  }
  if (input.error && input.itemCount === 0) return "error";
  return input.itemCount === 0 ? "empty" : "content";
}

export function appendUniqueRemoteFeedItems<T extends { post: { id: string } }>(
  current: T[],
  incoming: T[],
): T[] {
  const postIds = new Set(current.map((item) => item.post.id));
  const additions = incoming.filter((item) => {
    if (postIds.has(item.post.id)) return false;
    postIds.add(item.post.id);
    return true;
  });
  return additions.length > 0 ? [...current, ...additions] : current;
}
