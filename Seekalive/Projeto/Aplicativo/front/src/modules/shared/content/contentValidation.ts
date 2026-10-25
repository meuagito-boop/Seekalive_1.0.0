import { z } from "zod";
import type { Post } from "@/modules/social/types/post";
import type { Conversation, Message } from "@/modules/messages/types/message";
import type { PublishPostInput, SocialComment } from "@/modules/social/types/content";

export class ContentServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ContentServiceError";
  }
}
export const referenceSchema = z.object({
  type: z.enum(["seek_entity", "shop_item", "social_post"]),
  id: z.string().trim().min(1).max(200),
});
const inputSchema = z.object({
  authorId: z.string().min(1),
  content: z.string().max(280),
  audience: z.enum(["public", "circles", "private"]),
  format: z.enum(["text", "media", "article"]).optional(),
  article: z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(50000) }).optional(),
  mediaUrls: z.array(z.string().min(1)).max(8).optional(),
  mediaTypes: z.array(z.enum(["image", "video"])).max(8).optional(),
  reference: referenceSchema.optional(),
});
export function validatePublication(input: PublishPostInput): PublishPostInput {
  const result = inputSchema.safeParse(input);
  if (!result.success) throw new ContentServiceError("Revise os campos: título até 160 caracteres, corpo até 50 mil e texto curto até 280.", 422);
  const value = result.data;
  if (value.format === "article" && !value.article) throw new ContentServiceError("Informe título e corpo do artigo.", 422);
  if (value.format !== "article" && !value.content.trim() && !value.mediaUrls?.length) throw new ContentServiceError("Escreva algo ou adicione uma mídia.", 422);
  if ((value.mediaUrls?.length ?? 0) !== (value.mediaTypes?.length ?? 0)) throw new ContentServiceError("Os tipos de mídia não correspondem aos arquivos.", 422);
  if (value.format === "media" && !value.mediaUrls?.length) throw new ContentServiceError("Adicione uma foto ou vídeo.", 422);
  return value;
}
export function extractSocialTokens(text: string) {
  return {
    mentions: [...new Set(Array.from(text.matchAll(/@([\p{L}\p{N}_.]+)/gu), match => match[1]))],
    hashtags: [...new Set(Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu), match => match[1].toLocaleLowerCase("pt-BR")))],
  };
}
export function canReadPost(
  post: Post,
  viewerId: string | undefined,
  circleMember: boolean,
  authorIsPrivate = false,
  approvedFollower = false,
) {
  if (post.authorId === viewerId) return true;
  if (authorIsPrivate && !approvedFollower) return false;
  return post.audience === "public" || (post.audience === "circles" && circleMember);
}
export function makeDemoMessage(conversation: Conversation | undefined, authorId: string | undefined, content: string): Message {
  if (!authorId) throw new ContentServiceError("Entre na sua conta para enviar mensagens.", 401);
  if (!conversation) throw new ContentServiceError("Conversa indisponível.", 404);
  if (!conversation.participantIds.includes(authorId))
    throw new ContentServiceError("Você não participa desta conversa.", 403);
  const value = content.trim();
  if (!value || value.length > 5000)
    throw new ContentServiceError("Escreva uma mensagem com até 5.000 caracteres.", 422);
  return {
    id: `msg_${crypto.randomUUID()}`, conversationId: conversation.id,
    senderId: authorId, content: value, isRead: false, createdAt: new Date().toISOString(),
  };
}
export function makeDemoPost(input: PublishPostInput): Post {
  const value = validatePublication(input);
  return {
    ...value,
    id: `post_${crypto.randomUUID()}`,
    content: value.content.trim(),
    format: value.format ?? (value.mediaUrls?.length ? "media" : "text"),
    type: value.mediaTypes?.includes("video") ? "video" : "text",
    ...extractSocialTokens(`${value.content} ${value.article?.title ?? ""} ${value.article?.body ?? ""}`),
    createdAt: new Date().toISOString(),
    likes: 0, comments: 0, reposts: 0, shares: 0,
    isLiked: false, isReposted: false,
  };
}
export function makeDemoComment(postId: string, content: string, authorId: string, replyToCommentId?: string): SocialComment {
  if (!authorId) throw new ContentServiceError("Entre na sua conta para comentar.", 401);
  if (!content.trim() || content.length > 2000) throw new ContentServiceError("O comentário precisa ter entre 1 e 2.000 caracteres.", 422);
  return { id: `comment_${crypto.randomUUID()}`, postId, authorId, content: content.trim(), replyToCommentId, createdAt: new Date().toISOString(), likes: 0, isLiked: false };
}
export function assertCommentParent(comments: SocialComment[], postId: string, parentId?: string) {
  if (parentId && !comments.some(comment => comment.id === parentId && comment.postId === postId))
    throw new ContentServiceError("O comentário original não está disponível nesta publicação.", 404);
}
