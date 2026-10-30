import { z } from "zod";
import type { Post } from "@/modules/social/types/post";
import type { SocialComment } from "@/modules/social/types/posts";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";
import { referenceSchema } from "@/modules/app/content/referenceSchema";
import { getCsrfToken } from "@/modules/app/api/httpClient";

export const postSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  audience: z.enum(["public", "circles", "private"]),
  type: z.enum(["text", "video"]),
  likes: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  reposts: z.number().nonnegative(),
  shares: z.number().nonnegative(),
  format: z.enum(["text", "media", "article"]).optional(),
  article: z.object({ title: z.string(), body: z.string() }).optional(),
  reference: referenceSchema.optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaTypes: z.array(z.enum(["image", "video"])).optional(),
  isLiked: z.boolean().optional(),
  isReposted: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
  mentions: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
});

export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  replyToCommentId: z.string().nullable().optional(),
  likes: z.number().nonnegative(),
  isLiked: z.boolean().optional(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }).optional(),
});

export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    const method = init?.method?.toUpperCase() ?? "GET";
    const csrfToken = ["GET", "HEAD", "OPTIONS"].includes(method)
      ? undefined
      : await getCsrfToken();
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ContentServiceError("Falha de rede. Seu rascunho foi preservado; tente novamente.", 0);
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Sua sessão expirou. Entre novamente.",
      403: "Você não tem permissão para esta ação.",
      404: "Conteúdo indisponível.",
      409: "O conteúdo mudou. Atualize antes de tentar novamente.",
      422: "Revise os campos informados.",
    };
    throw new ContentServiceError(
      messages[response.status] ?? "O serviço está indisponível. Tente novamente.",
      response.status,
    );
  }
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    throw new ContentServiceError("O serviço retornou uma resposta inválida.", 502);
  }
}

export function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ContentServiceError("A resposta do servidor não corresponde ao contrato esperado.", 502);
  }
  return parsed.data;
}

export function parsePost(value: unknown): Post {
  return { ...parseResponse(postSchema, value), source: "server" };
}

export function parseComment(value: unknown): SocialComment {
  return parseResponse(commentSchema, value);
}
