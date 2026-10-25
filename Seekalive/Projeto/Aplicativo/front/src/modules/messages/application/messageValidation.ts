import type { Conversation } from "@/modules/messages/types/conversation";
import type { Message } from "@/modules/messages/types/message";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";

export function makeDemoMessage(
  conversation: Conversation | undefined,
  authorId: string | undefined,
  content: string,
): Message {
  if (!authorId) throw new ContentServiceError("Entre na sua conta para enviar mensagens.", 401);
  if (!conversation) throw new ContentServiceError("Conversa indisponível.", 404);
  if (!conversation.participantIds.includes(authorId)) {
    throw new ContentServiceError("Você não participa desta conversa.", 403);
  }
  const value = content.trim();
  if (!value || value.length > 5000) {
    throw new ContentServiceError("Escreva uma mensagem com até 5.000 caracteres.", 422);
  }
  return {
    id: `msg_${crypto.randomUUID()}`,
    conversationId: conversation.id,
    senderId: authorId,
    content: value,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}
