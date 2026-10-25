import type { Notification } from "@/modules/notifications/types/notification";

interface SelectVisibleNotificationsInput {
  notifications: Notification[];
  actorId: string;
  currentUserId?: string;
  isDevelopmentPreview: boolean;
  blockedAccountIds: Set<string>;
  blockedPostIds: Set<string>;
  readNotificationIds: string[];
}

export function selectVisibleNotifications({
  notifications,
  actorId,
  currentUserId,
  isDevelopmentPreview,
  blockedAccountIds,
  blockedPostIds,
  readNotificationIds,
}: SelectVisibleNotificationsInput): Notification[] {
  return notifications
    .filter((notification) => notification.recipientId
      ? notification.recipientId === actorId
      : isDevelopmentPreview && actorId === currentUserId)
    .filter((notification) => !blockedAccountIds.has(notification.actorId)
      && (!notification.entityId || !blockedPostIds.has(notification.entityId)))
    .map((notification) => ({
      ...notification,
      isRead: readNotificationIds.includes(notification.id)
        || (isDevelopmentPreview && actorId === currentUserId && notification.isRead),
    }));
}
