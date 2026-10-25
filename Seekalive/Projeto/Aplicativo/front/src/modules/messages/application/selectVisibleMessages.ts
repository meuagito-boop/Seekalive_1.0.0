import type { Conversation } from "@/modules/messages/types/conversation";
import type { Message } from "@/modules/messages/types/message";

interface SelectVisibleMessagesInput {
  conversations: Conversation[];
  messages: Message[];
  actorId: string;
  currentUserId?: string;
  isDevelopmentPreview: boolean;
  blockedAccountIds: Set<string>;
  readConversationIds: string[];
  readMessageIds: string[];
}

export function selectVisibleMessages({
  conversations,
  messages,
  actorId,
  currentUserId,
  isDevelopmentPreview,
  blockedAccountIds,
  readConversationIds,
  readMessageIds,
}: SelectVisibleMessagesInput) {
  const visibleConversations = conversations
    .filter((conversation) => conversation.participantIds.includes(actorId)
      && !conversation.participantIds.some((id) => id !== actorId && blockedAccountIds.has(id)))
    .map((conversation) => ({
      ...conversation,
      unreadCount: readConversationIds.includes(conversation.id) ? 0 : conversation.unreadCount,
    }));
  const visibleConversationIds = new Set(visibleConversations.map((conversation) => conversation.id));
  const visibleMessages = messages
    .filter((message) => visibleConversationIds.has(message.conversationId))
    .map((message) => ({
      ...message,
      isRead: message.senderId === actorId
        ? message.isRead
        : readMessageIds.includes(message.id)
          || (isDevelopmentPreview && actorId === currentUserId && message.isRead),
    }));

  return { visibleConversations, visibleMessages, visibleConversationIds };
}
