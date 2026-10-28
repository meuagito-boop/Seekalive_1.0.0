import type { AccountActivity } from "@/modules/app/persistence/accountActivityStorage";
import type { MessageState } from "@/modules/messages/state/messageReducer";

interface MarkConversationReadDependencies {
  state: MessageState;
  actorId: string;
  visibleConversationIds: Set<string>;
  updateCurrentActivity: (
    update: (current: AccountActivity) => AccountActivity,
  ) => void;
}

export function createMarkConversationReadAction({
  state,
  actorId,
  visibleConversationIds,
  updateCurrentActivity,
}: MarkConversationReadDependencies) {
  return (conversationId: string): void => {
    if (!visibleConversationIds.has(conversationId)) return;

    const messageIds = state.messages
      .filter(
        (message) =>
          message.conversationId === conversationId &&
          message.senderId !== actorId,
      )
      .map((message) => message.id);

    updateCurrentActivity((current) => ({
      ...current,
      readConversationIds: current.readConversationIds.includes(conversationId)
        ? current.readConversationIds
        : [...current.readConversationIds, conversationId],
      readMessageIds: [...new Set([...current.readMessageIds, ...messageIds])],
    }));
  };
}
