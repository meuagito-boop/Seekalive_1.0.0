import type { CommentPosition } from "../domain/postInteractions";
import { isFeedResourceId } from "../domain/feedResourceId";

interface CursorContext {
  postId: string;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function encodeCommentCursor(
  position: CommentPosition,
  context: CursorContext,
): string {
  return encodeBase64Url(
    JSON.stringify({
      postId: context.postId,
      createdAt: position.createdAt.toISOString(),
      id: position.id,
    }),
  );
}

export function parseCommentCursor(
  value: unknown,
  context: CursorContext,
): CommentPosition | null | undefined {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 512) return undefined;

  const decoded = decodeBase64Url(value);
  if (!decoded) return undefined;

  try {
    const parsed = JSON.parse(decoded) as {
      postId?: unknown;
      createdAt?: unknown;
      id?: unknown;
    };
    if (
      parsed.postId !== context.postId ||
      typeof parsed.createdAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.createdAt)) ||
      !isFeedResourceId(parsed.id)
    ) {
      return undefined;
    }
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    return undefined;
  }
}
