import assert from "node:assert/strict";
import { test } from "node:test";
import { currentUser, mockUsers } from "../src/data/mockData";
import { createDemoMessage } from "../src/modules/messages/application/createDemoMessage";
import { createMarkConversationReadAction } from "../src/modules/messages/application/markConversationRead";
import { createSendMessageAction } from "../src/modules/messages/application/sendMessage";
import { messageReducer } from "../src/modules/messages/state/messageReducer";
import type { MessageAction, MessageState } from "../src/modules/messages/state/messageReducer";
import type { Conversation } from "../src/modules/messages/types/conversation";
import type { User } from "../src/modules/profile/types/user";

const recipient = mockUsers.find(
  (user) => user.id !== currentUser.id && !user.isBlocked,
);
assert.ok(recipient, "the message tests need an available recipient fixture");

const conversation: Conversation = {
  id: "conversation-message-tests",
  participantIds: [currentUser.id, recipient.id],
  unreadCount: 1,
  createdAt: "2026-10-28T12:00:00.000Z",
};

const initialState: MessageState = {
  conversations: [conversation],
  messages: [],
};

function createSendAction({
  policy = "everyone",
  isMutualFollower = false,
  recipientUser = recipient,
}: {
  policy?: "everyone" | "circle" | "nobody";
  isMutualFollower?: boolean;
  recipientUser?: User;
} = {}) {
  const dispatched: MessageAction[] = [];
  const sendMessage = createSendMessageAction({
    state: initialState,
    currentUser,
    users: [recipientUser],
    dispatch: (action) => dispatched.push(action),
    getRecipientMessagePolicy: () => policy,
    isMutualFollower: () => isMutualFollower,
  });
  return { sendMessage, dispatched };
}

test("a mensagem local valida participação e mantém remetente e conversa", () => {
  const message = createDemoMessage(
    conversation,
    currentUser.id,
    "  Olá!  ",
  );

  assert.equal(message.senderId, currentUser.id);
  assert.equal(message.conversationId, conversation.id);
  assert.equal(message.content, "Olá!");
  assert.throws(() =>
    createDemoMessage(conversation, undefined, "Olá"),
  );
  assert.throws(() =>
    createDemoMessage(conversation, "outra-conta", "Olá"),
  );
  assert.throws(() =>
    createDemoMessage(undefined, currentUser.id, "Olá"),
  );
  assert.throws(() =>
    createDemoMessage(conversation, currentUser.id, " "),
  );
});

test("o reducer adiciona a mensagem uma vez e atualiza a última mensagem", () => {
  const message = createDemoMessage(conversation, currentUser.id, "Olá");
  const action: MessageAction = { type: "SEND_MESSAGE", message };
  const sent = messageReducer(initialState, action);

  assert.equal(sent.messages[0]?.id, message.id);
  assert.equal(sent.conversations[0]?.lastMessage?.id, message.id);
  assert.equal(messageReducer(sent, action).messages.length, 1);
});

test("o envio respeita preferências de destinatário e Círculo mútuo", () => {
  const allowed = createSendAction();
  const message = allowed.sendMessage(conversation.id, "  Olá!  ");
  assert.equal(message.content, "Olá!");
  assert.equal(allowed.dispatched.length, 1);

  const nobody = createSendAction({ policy: "nobody" });
  assert.throws(
    () => nobody.sendMessage(conversation.id, "Olá"),
    /não está recebendo mensagens diretas/,
  );
  assert.equal(nobody.dispatched.length, 0);

  const outsideCircle = createSendAction({
    policy: "circle",
    isMutualFollower: false,
  });
  assert.throws(
    () => outsideCircle.sendMessage(conversation.id, "Olá"),
    /apenas do próprio Círculo/,
  );
  assert.equal(outsideCircle.dispatched.length, 0);

  const insideCircle = createSendAction({
    policy: "circle",
    isMutualFollower: true,
  });
  assert.doesNotThrow(() =>
    insideCircle.sendMessage(conversation.id, "Olá"),
  );
  assert.equal(insideCircle.dispatched.length, 1);
});

test("o envio bloqueia destinatário indisponível antes de despachar", () => {
  const blocked = createSendAction({
    recipientUser: { ...recipient, isBlocked: true },
  });

  assert.throws(
    () => blocked.sendMessage(conversation.id, "Olá"),
    /não está disponível para mensagens/,
  );
  assert.equal(blocked.dispatched.length, 0);
});

test("marcar leitura só atualiza a atividade de conversa visível", () => {
  let updateCount = 0;
  const markConversationRead = createMarkConversationReadAction({
    state: initialState,
    actorId: currentUser.id,
    visibleConversationIds: new Set([conversation.id]),
    updateCurrentActivity: () => {
      updateCount += 1;
    },
  });

  markConversationRead("conversation-hidden");
  assert.equal(updateCount, 0);
  markConversationRead(conversation.id);
  assert.equal(updateCount, 1);
});
