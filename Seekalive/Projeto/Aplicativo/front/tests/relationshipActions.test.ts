import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "../src/modules/profile/types/user";
import { createSocialRelationshipActions } from "../src/modules/social/application/relationshipActions";
import type { SocialGraphAction } from "../src/modules/social/state/relationshipReducer";

function makeUser(id: string, username: string): User {
  return {
    id,
    username,
    displayName: username,
    bio: "",
    avatarUrl: "",
    coverUrl: "",
    joinedAt: "2026-01-01T00:00:00.000Z",
    accountType: "personal",
    stats: { posts: 0, followers: 0, following: 0, circles: 0 },
    followingIds: [],
  };
}

test("Social delega gravação da conta demonstrativa à composição do app", async () => {
  const viewer = makeUser("viewer", "ana");
  const target = makeUser("target", "bia");
  const savedAccounts: User[] = [];
  const actions: SocialGraphAction[] = [];
  const dependencies = {
    state: { users: [viewer, target], followRequests: [] },
    currentUser: viewer,
    viewer,
    isRemoteSocialSession: false,
    blockedUserIdSet: new Set<string>(),
    accountsBlockingViewerSet: new Set<string>(),
    dispatch: (action: SocialGraphAction) => actions.push(action),
    updateAccount: () => undefined,
    remoteFollowRequests: [],
    setRemoteFollowRequests: () => undefined,
    setRemoteBlockedUserIds: () => undefined,
    toggleBlockedUser: () => undefined,
    showRefreshWarning: () => undefined,
    savePreviewAccount: (account: User) => savedAccounts.push(account),
  };
  const relationshipActions = createSocialRelationshipActions(dependencies);

  assert.equal(await relationshipActions.toggleFollow(target.id), true);
  assert.equal(savedAccounts.length, 1);
  assert.equal(savedAccounts[0]?.id, target.id);
  assert.equal(savedAccounts[0]?.isFollowing, true);
  assert.ok(actions.some((action) => action.type === "UPDATE_USER"));
});
