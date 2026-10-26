import type { PostPosition } from "../domain/post";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PostCursor = PostPosition;
export type PostCursorScope = { authorId: string; format: "all" | "text" | "article" };

export function parsePostCursor(
  value: unknown,
  scope: PostCursorScope,
): PostCursor | null | undefined {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 512) return undefined;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const payload = JSON.parse(decoded) as {
      version?: unknown;
      authorId?: unknown;
      format?: unknown;
      createdAt?: unknown;
      id?: unknown;
    };
    const date = new Date(String(payload.createdAt));
    if (
      payload.version !== 1
      || payload.authorId !== scope.authorId
      || payload.format !== scope.format
      || !Number.isFinite(date.getTime())
      || typeof payload.id !== "string"
      || !UUID_PATTERN.test(payload.id)
    ) {
      return undefined;
    }
    return { createdAt: date, id: payload.id };
  } catch {
    return undefined;
  }
}

export function encodePostCursor(
  post: PostPosition,
  scope: PostCursorScope,
) {
  return Buffer.from(JSON.stringify({
    version: 1,
    authorId: scope.authorId,
    format: scope.format,
    createdAt: post.createdAt.toISOString(),
    id: post.id,
  })).toString("base64url");
}
