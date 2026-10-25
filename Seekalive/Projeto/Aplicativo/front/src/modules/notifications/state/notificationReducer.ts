import type { Notification } from "@/modules/notifications/types/notification";

export interface NotificationState {
  notifications: Notification[];
}

export type NotificationAction =
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "MARK_NOTIFICATION_READ"; id: string };

export function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
      };
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id ? { ...notification, isRead: true } : notification,
        ),
      };
  }
}
