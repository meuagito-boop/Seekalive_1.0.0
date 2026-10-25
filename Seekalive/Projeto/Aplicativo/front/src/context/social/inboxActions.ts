import type { Dispatch } from "react";
import type { Conversation, Message, Notification, User } from "@/data/mockData";
import { getPrivacyPreferences } from "@/data/appPreferences";
import { makeDemoMessage } from "@/services/contentValidation";
import { ContentServiceError } from "@/services/contentService";
import { areMutualFollowers } from "@/lib/followRelationships";
import type { SocialAction, SocialState } from "@/context/social/state";
import type { SocialAccountActivity } from "@/data/socialAccountActivityStorage";

type InboxActionDependencies = {
  state: SocialState;
  currentUser: User | null;
  users: User[];
  actorId: string;
  visibleNotifications: Notification[];
  visibleConversations: Conversation[];
  visibleConversationIds: Set<string>;
  updateCurrentActivity: (
    update: (current: SocialAccountActivity) => SocialAccountActivity,
  ) => void;
  dispatch: Dispatch<SocialAction>;
};

export function createSocialInboxActions(dependencies: InboxActionDependencies) {
  const {
    state,
    currentUser,
    users,
    actorId,
    visibleNotifications,
    visibleConversations,
    visibleConversationIds,
    updateCurrentActivity,
    dispatch,
  } = dependencies;

  return {
    markAllNotificationsRead: () => updateCurrentActivity((current) => ({
      ...current,
      readNotificationIds: [
        ...new Set([...current.readNotificationIds, ...visibleNotifications.map((item) => item.id)]),
      ],
    })),
    markNotificationRead: (id: string) => {
      if (!visibleNotifications.some((notification) => notification.id === id)) return;
      updateCurrentActivity((current) => ({
        ...current,
        readNotificationIds: current.readNotificationIds.includes(id)
          ? current.readNotificationIds
          : [...current.readNotificationIds, id],
      }));
    },
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
