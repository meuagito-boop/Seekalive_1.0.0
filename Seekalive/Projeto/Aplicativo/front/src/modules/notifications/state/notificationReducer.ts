import type { SocialAction, SocialState } from "@/modules/app/state/socialState";

export function reduceNotifications(state: SocialState, action: SocialAction): SocialState | null {
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
    default:
      return null;
  }
}
