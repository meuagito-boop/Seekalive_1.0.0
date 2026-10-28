import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyAccountActivity } from "../src/modules/app/persistence/accountActivityStorage";
import { createNotificationActions } from "../src/modules/notifications/application/notificationActions";
import { selectVisibleNotifications } from "../src/modules/notifications/application/selectVisibleNotifications";
import type { Notification } from "../src/modules/notifications/types/notification";

function createNotification(
  id: string,
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id,
    recipientId: "account-a",
    type: "follow",
    actorId: "account-b",
    isRead: false,
    createdAt: "2026-10-28T12:00:00.000Z",
    ...overrides,
  };
}

function selectNotifications(
  notifications: Notification[],
  options: {
    actorId?: string;
    currentUserId?: string;
    isDevelopmentPreview?: boolean;
    blockedAccountIds?: Set<string>;
    blockedPostIds?: Set<string>;
    readNotificationIds?: string[];
  } = {},
) {
  return selectVisibleNotifications({
    notifications,
    actorId: options.actorId ?? "account-a",
    currentUserId: options.currentUserId,
    isDevelopmentPreview: options.isDevelopmentPreview ?? false,
    blockedAccountIds: options.blockedAccountIds ?? new Set(),
    blockedPostIds: options.blockedPostIds ?? new Set(),
    readNotificationIds: options.readNotificationIds ?? [],
  });
}

test("o seletor limita notificações ao destinatário e aplica leitura local", () => {
  const visible = createNotification("visible");
  const hiddenForAnotherAccount = createNotification("other", {
    recipientId: "account-c",
  });
  const unaddressed = createNotification("unaddressed", {
    recipientId: undefined,
  });

  const result = selectNotifications(
    [visible, hiddenForAnotherAccount, unaddressed],
    { readNotificationIds: [visible.id] },
  );

  assert.deepEqual(result.map(({ id }) => id), [visible.id]);
  assert.equal(result[0]?.isRead, true);
});

test("notificação sem destinatário só aparece no preview da conta atual", () => {
  const previewNotification = createNotification("preview-only", {
    recipientId: undefined,
    isRead: true,
  });

  assert.equal(
    selectNotifications([previewNotification], {
      actorId: "account-a",
      currentUserId: "account-a",
      isDevelopmentPreview: true,
    }).length,
    1,
  );
  assert.equal(
    selectNotifications([previewNotification], {
      actorId: "account-a",
      currentUserId: "account-a",
      isDevelopmentPreview: false,
    }).length,
    0,
  );
  assert.equal(
    selectNotifications([previewNotification], {
      actorId: "account-b",
      currentUserId: "account-a",
      isDevelopmentPreview: true,
    }).length,
    0,
  );
});

test("o seletor oculta atores bloqueados e recursos de publicação bloqueados", () => {
  const blockedActor = createNotification("blocked-actor", {
    actorId: "blocked-account",
  });
  const blockedPost = createNotification("blocked-post", {
    entityId: "blocked-post-id",
  });
  const visible = createNotification("visible");

  const result = selectNotifications(
    [blockedActor, blockedPost, visible],
    {
      blockedAccountIds: new Set(["blocked-account"]),
      blockedPostIds: new Set(["blocked-post-id"]),
    },
  );

  assert.deepEqual(result.map(({ id }) => id), [visible.id]);
});

test("ações de leitura alteram somente IDs visíveis e são idempotentes", () => {
  let activity = emptyAccountActivity();
  const visible = createNotification("visible");
  const actions = createNotificationActions({
    visibleNotifications: [visible],
    updateCurrentActivity: (update) => {
      activity = update(activity);
    },
  });

  actions.markNotificationRead(visible.id);
  actions.markNotificationRead(visible.id);
  actions.markNotificationRead("not-visible");
  assert.deepEqual(activity.readNotificationIds, [visible.id]);

  actions.markAllNotificationsRead();
  assert.deepEqual(activity.readNotificationIds, [visible.id]);
});
