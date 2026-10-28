import type { Dispatch } from "react";
import type { User } from "@/modules/profile/types/user";
import type { MessageAction, MessageState } from "@/modules/messages/state/messageReducer";
import type { Message } from "@/modules/messages/types/message";
import { ContentServiceError } from "@/modules/app/api/contentServiceError";
import { createDemoMessage } from "@/modules/messages/application/createDemoMessage";

type RecipientMessagePolicy = "everyone" | "circle" | "nobody";

interface SendMessageDependencies {
  state: MessageState;
  currentUser: User | null;
  users: User[];
  dispatch: Dispatch<MessageAction>;
  getRecipientMessagePolicy: (
    recipientAccountId: string,
  ) => RecipientMessagePolicy;
  isMutualFollower: (recipient: User) => boolean;
}

export function createSendMessageAction({
  state,
  currentUser,
  users,
  dispatch,
  getRecipientMessagePolicy,
  isMutualFollower,
}: SendMessageDependencies) {
  return (conversationId: string, content: string): Message => {
    const conversation = state.conversations.find(
      (item) => item.id === conversationId,
    );
    const message = createDemoMessage(conversation, currentUser?.id, content);
    const recipients = conversation?.participantIds
      .filter((id) => id !== currentUser?.id)
      .map((id) => users.find((user) => user.id === id));

    if (recipients?.some((recipient) => !recipient)) {
      throw new ContentServiceError(
        "A pessoa desta conversa não está disponível.",
        404,
      );
    }

    const availableRecipients = (recipients ?? []).filter(
      (recipient): recipient is User => recipient !== undefined,
    );

    if (availableRecipients.some((recipient) => recipient.isBlocked)) {
      throw new ContentServiceError(
        "Esta pessoa não está disponível para mensagens.",
        403,
      );
    }

    const policies = availableRecipients.map((recipient) =>
      getRecipientMessagePolicy(recipient.id),
    );

    if (policies.includes("nobody")) {
      throw new ContentServiceError(
        "Esta pessoa não está recebendo mensagens diretas.",
        403,
      );
    }

    if (
      policies.includes("circle") &&
      availableRecipients.some((recipient) => !isMutualFollower(recipient))
    ) {
      throw new ContentServiceError(
        "Esta pessoa recebe mensagens apenas do próprio Círculo.",
        403,
      );
    }

    dispatch({ type: "SEND_MESSAGE", message });
    return message;
  };
}
