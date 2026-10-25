export interface Notification {
  id: string;
  recipientId?: string;
  type: "follow" | "like" | "comment" | "repost" | "mention";
  actorId: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}
