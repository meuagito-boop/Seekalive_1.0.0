import type { Dispatch } from "react";
import type { Conversation } from "@/modules/messages/types/conversation";
import type { Message } from "@/modules/messages/types/message";
import type { User } from "@/modules/profile/types/user";
import { getPrivacyPreferences } from "@/modules/settings/data/privacyPreferences";
import { makeDemoMessage } from "@/modules/messages/application/messageValidation";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";
import { areMutualFollowers } from "@/modules/social/domain/followRelationships";
import type { MessageAction, MessageState } from "@/modules/messages/state/messageReducer";
import type { AccountActivity } from "@/modules/app/persistence/accountActivityStorage";

type MessageActionDependencies = {
  state: MessageState;
  currentUser: User | null;
  users: User[];
  actorId: string;
  visibleConversationIds: Set<string>;
  updateCurrentActivity: (update: (current: AccountActivity) => AccountActivity) => void;
  dispatch: Dispatch<MessageAction>;
};

export function createMessageActions({
  state,
  currentUser,
  users,
  actorId,
  visibleConversationIds,
  updateCurrentActivity,
  dispatch,
}: MessageActionDependencies) {
  return {
    markConversationRead: (convId: string) => {
      if (!visibleConversationIds.has(convId)) return;
      const messageIds = state.messages
        .filter((message) => message.conversationId === convId && message.senderId !== actorId)
        .map((message) => message.id);
      updateCurrentActivity((current) => ({
        ...current,
        readConversationIds: current.readConversationIds.includes(convId)
          ? current.readConversationIds
          : [...current.readConversationIds, convId],
        readMessageIds: [...new Set([...current.readMessageIds, ...messageIds])],
      }));
    },
    sendMessage: (convId: string, content: string): Message => {
      const conversation = state.conversations.find((item) => item.id === convId);
      const message = makeDemoMessage(conversation, currentUser?.id, content);
      const recipients = conversation?.participantIds
        .filter((id) => id !== currentUser?.id)
        .map((id) => users.find((user) => user.id === id));
      if (recipients?.some((recipient) => !recipient)) {
        throw new ContentServiceError("A pessoa desta conversa não está disponível.", 404);
      }
      if (recipients?.some((recipient) => recipient?.isBlocked)) {
        throw new ContentServiceError("Esta pessoa não está disponível para mensagens.", 403);
      }
      const policies = (recipients ?? []).map((recipient) =>
        getPrivacyPreferences(recipient!.id).messages,
      );
      if (policies.includes("nobody")) {
        throw new ContentServiceError("Esta pessoa não está recebendo mensagens diretas.", 403);
      }
      if (
        policies.includes("circle")
        && recipients?.some((recipient) => !areMutualFollowers(currentUser ?? undefined, recipient))
      ) {
        throw new ContentServiceError("Esta pessoa recebe mensagens apenas do próprio Círculo.", 403);
      }
      dispatch({ type: "SEND_MESSAGE", message });
      return message;
    },
  };
}
