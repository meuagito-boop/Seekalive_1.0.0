import type { SocialAction, SocialState } from "@/modules/app/state/socialState";

export function reduceMessages(state: SocialState, action: SocialAction): SocialState | null {
  switch (action.type) {
    case "MARK_CONVERSATION_READ":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.convId ? { ...conversation, unreadCount: 0 } : conversation,
        ),
        messages: state.messages.map((message) =>
          message.conversationId === action.convId ? { ...message, isRead: true } : message,
        ),
      };
    case "SEND_MESSAGE": {
      const message = action.message;
      const conversation = state.conversations.find((item) => item.id === message.conversationId);
      if (
        !conversation?.participantIds.includes(message.senderId)
        || state.messages.some((item) => item.id === message.id)
      ) return state;
      return {
        ...state,
        messages: [...state.messages, message],
        conversations: state.conversations.map((item) =>
          item.id === message.conversationId
            ? { ...item, lastMessage: message, unreadCount: 0 }
            : item,
        ),
      };
    }
    default:
      return null;
  }
}
