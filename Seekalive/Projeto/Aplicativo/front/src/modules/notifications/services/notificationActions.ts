import type { SocialAccountActivity } from "@/modules/app/storage/socialAccountActivityStorage";
import type { Notification } from "@/modules/notifications/types/notification";

type NotificationActionDependencies = {
  visibleNotifications: Notification[];
  updateCurrentActivity: (
    update: (current: SocialAccountActivity) => SocialAccountActivity,
  ) => void;
};

export function createNotificationActions({
  visibleNotifications,
  updateCurrentActivity,
}: NotificationActionDependencies) {
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
  };
}
