import type { Message } from "@/modules/messages/types/message";

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}
