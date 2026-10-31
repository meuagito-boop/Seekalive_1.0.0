import type { PostPosition, SocialFeedTab } from "../domain/post";
import { isFeedResourceId } from "../domain/feedResourceId";

export type GlobalFeedCursorScope = {
  tab: SocialFeedTab;
  viewerId: string | null;
  searchTerm?: string;
};

export function encodeGlobalFeedCursor(
  position: PostPosition,
  scope: GlobalFeedCursorScope,
): string {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      tab: scope.tab,
      viewerId: scope.viewerId,
      searchTerm: scope.searchTerm ?? null,
      createdAt: position.createdAt.toISOString(),
      id: position.id,
    }),
    "utf8",
  ).toString("base64url");
}

export function parseGlobalFeedCursor(
  value: unknown,
  scope: GlobalFeedCursorScope,
): PostPosition | null | undefined {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 512) return undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as {
      version?: unknown;
      tab?: unknown;
      viewerId?: unknown;
      searchTerm?: unknown;
      createdAt?: unknown;
      id?: unknown;
    };
    if (
      payload.version !== 1 ||
      payload.tab !== scope.tab ||
      payload.viewerId !== scope.viewerId ||
      (payload.searchTerm ?? null) !== (scope.searchTerm ?? null) ||
      typeof payload.createdAt !== "string" ||
      !Number.isFinite(Date.parse(payload.createdAt)) ||
      !isFeedResourceId(payload.id)
    ) {
      return undefined;
    }
    return {
      createdAt: new Date(payload.createdAt),
      id: payload.id,
    };
  } catch {
    return undefined;
  }
}
