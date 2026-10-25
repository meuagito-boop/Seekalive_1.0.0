import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "../src/modules/profile/types/user";
import type { Post } from "../src/modules/social/types/post";
import { normalizeSocialSearchQuery } from "../src/modules/social/utils/searchQuery";
import { getSearchResults } from "../src/modules/social/utils/searchResults";

function makeUser(
  id: string,
  overrides: Partial<User> = {},
): User {
  return {
    id,
    displayName: id,
    username: id,
    bio: "",
    isPrivate: false,
    isFollowing: false,
    isInCircle: false,
    ...overrides,
  } as User;
}

function makePost(
  id: string,
  authorId: string,
  overrides: Partial<Post> = {},
): Post {
  return {
    id,
    authorId,
    content: "",
    audience: "public",
    type: "text",
    createdAt: "2026-01-01T00:00:00.000Z",
    likes: 0,
    comments: 0,
    reposts: 0,
    shares: 0,
    ...overrides,
  };
}

test("a busca social ignora maiúsculas e não inclui publicações sem acesso", () => {
  const users = [
    makeUser("public-author"),
    makeUser("private-author", { isPrivate: true }),
  ];
  const posts = [
    makePost("public-post", "public-author", {
      content: "Um roteiro com React",
      hashtags: ["ReactJS"],
    }),
    makePost("private-post", "private-author", {
      content: "React secreto",
      audience: "public",
    }),
  ];

  const result = getSearchResults({
    posts,
    users,
    query: "  rEaCt ",
    viewerId: "viewer",
    currentUserId: "viewer",
    isRemoteSocialSession: false,
    remoteUsers: [],
    trendingTopics: [],
  });

  assert.deepEqual(result.filteredPosts.map((post) => post.id), ["public-post"]);
});

test("a busca local encontra nome ou @ e não recomenda a própria conta", () => {
  const viewer = makeUser("viewer", { displayName: "Ana" });
  const person = makeUser("cafe-da-ana", { displayName: "Café da Ana" });

  const result = getSearchResults({
    posts: [],
    users: [viewer, person],
    query: "CAFÉ",
    viewerId: viewer.id,
    currentUserId: viewer.id,
    isRemoteSocialSession: false,
    remoteUsers: [],
    trendingTopics: [],
  });

  assert.deepEqual(result.filteredUsers.map((user) => user.id), [person.id]);
  assert.deepEqual(result.suggestedUsers.map((user) => user.id), [person.id]);
});

test("a busca por @ é normalizada para o identificador e ignora espaços externos", () => {
  const person = makeUser("cafe-da-ana", { displayName: "Café da Ana" });
  const result = getSearchResults({
    posts: [],
    users: [person],
    query: "  @cafe-da-ana ",
    viewerId: "viewer",
    currentUserId: "viewer",
    isRemoteSocialSession: false,
    remoteUsers: [],
    trendingTopics: [],
  });

  assert.equal(normalizeSocialSearchQuery("  @cafe-da-ana "), "cafe-da-ana");
  assert.deepEqual(result.filteredUsers.map((user) => user.id), [person.id]);
});

test("a busca remota usa somente contas recebidas do serviço e filtra tendências no preview", () => {
  const remoteUser = makeUser("server-account");
  const trendingTopics = [
    { tag: "#ReactJS", category: "Tecnologia", count: 10 },
    { tag: "#Café", category: "Social", count: 5 },
  ];

  const result = getSearchResults({
    posts: [],
    users: [makeUser("local-account")],
    query: "  #REACT ",
    viewerId: "viewer",
    currentUserId: "viewer",
    isRemoteSocialSession: true,
    remoteUsers: [remoteUser],
    trendingTopics,
  });

  assert.deepEqual(result.filteredUsers, [remoteUser]);
  assert.deepEqual(result.suggestedUsers, []);
  assert.deepEqual(result.filteredTags.map((topic) => topic.tag), ["#ReactJS"]);
});
