import { z } from "zod";
import type { Post } from "@/data/mockData";
import type { PublishPostInput, SocialComment } from "@/types/social/posts";
import { ContentServiceError, makeDemoComment, makeDemoPost, referenceSchema, validatePublication } from "./contentValidation";
export { ContentServiceError } from "./contentValidation";

export interface ContentService {
  createPost(input: PublishPostInput): Promise<Post>;
  createComment(postId: string, content: string, authorId: string, replyToCommentId?: string): Promise<SocialComment>;
}
// Explicit session-only demo adapter. No network or durable storage.
export const demoContentAdapter: ContentService = {
  async createPost(input) { return makeDemoPost(input); },
  async createComment(postId, content, authorId, parent) { return makeDemoComment(postId, content, authorId, parent); },
};
export const postSchema = z.object({
  id: z.string(), authorId: z.string(), content: z.string(), createdAt: z.string(),
  audience: z.enum(["public", "circles", "private"]), type: z.enum(["text", "video"]),
  likes: z.number().nonnegative(), comments: z.number().nonnegative(), reposts: z.number().nonnegative(), shares: z.number().nonnegative(),
  format: z.enum(["text", "media", "article"]).optional(),
  article: z.object({ title: z.string(), body: z.string() }).optional(),
  reference: referenceSchema.optional(), mediaUrls: z.array(z.string()).optional(),
  mediaTypes: z.array(z.enum(["image", "video"])).optional(),
  isLiked: z.boolean().optional(), isReposted: z.boolean().optional(),
  mentions: z.array(z.string()).optional(), hashtags: z.array(z.string()).optional(),
});
export const commentSchema = z.object({
  id: z.string(), postId: z.string(), authorId: z.string(), content: z.string(), createdAt: z.string(),
  replyToCommentId: z.string().optional(), likes: z.number().nonnegative(), isLiked: z.boolean().optional(),
});
export async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ContentServiceError("Falha de rede. Seu rascunho foi preservado; tente novamente.", 0);
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Sua sessão expirou. Entre novamente.", 403: "Você não tem permissão para esta ação.",
      404: "Conteúdo indisponível.", 409: "O conteúdo mudou. Atualize antes de tentar novamente.",
      422: "Revise os campos informados.",
    };
    throw new ContentServiceError(messages[response.status] ?? "O serviço está indisponível. Tente novamente.", response.status);
  }
  if (response.status === 204) return null;
  try { return await response.json(); }
  catch { throw new ContentServiceError("O serviço retornou uma resposta inválida.", 502); }
}
export function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ContentServiceError("A resposta do servidor não corresponde ao contrato esperado.", 502);
  return parsed.data;
}
// Not enabled: proposed backend endpoints do not currently exist.
export const restContentAdapter: ContentService = {
  async createPost(input) {
    validatePublication(input);
    const path = input.format === "article" ? "/api/v1/social/articles" : "/api/v1/social/posts";
    return parseResponse(postSchema, await apiRequest(path, { method: "POST", body: JSON.stringify(input) }));
  },
  async createComment(postId, content, authorId, replyToCommentId) {
    return parseResponse(commentSchema, await apiRequest(`/api/v1/social/posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST", body: JSON.stringify({ text: content, authorId, replyToCommentId: replyToCommentId ?? null }),
    }));
  },
};
export const contentService: ContentService = demoContentAdapter;
