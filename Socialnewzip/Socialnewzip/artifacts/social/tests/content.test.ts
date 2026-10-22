import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemoPost, makeDemoComment, extractSocialTokens, validatePublication, canReadPost, assertCommentParent } from "../src/services/contentValidation";
import { apiRequest, restContentAdapter } from "../src/services/contentService";
import { resolveReference } from "../src/services/referenceResolver";
import { socialReducer, type SocialState } from "../src/context/SocialContext";
import { mockUsers } from "../src/data/mockData";
import type { PublishPostInput } from "../src/types/content";

const input: PublishPostInput = { content: "Minha opinião #café", authorId: "me", audience: "public" };
const post = makeDemoPost(input);
const state = (): SocialState => ({ posts: [post], users: mockUsers, conversations: [], messages: [], notifications: [], reviews: [], postComments: [], repostEntries: [] });
test("não publica vazio, mídia incoerente nem artigo sem título/corpo", () => {
  for (const value of [
    { ...input, content: "" },
    { ...input, format: "article" as const },
    { ...input, format: "article" as const, article: { title: "", body: "corpo" } },
    { ...input, mediaUrls: ["blob:foto"], mediaTypes: [] },
    { ...input, content: "x".repeat(281) },
  ]) assert.throws(() => validatePublication(value));
});
test("mídia sem legenda e artigo com referência preservam autoria", () => {
  assert.equal(makeDemoPost({ ...input, content: "", mediaUrls: ["blob:foto"], mediaTypes: ["image"] }).format, "media");
  const article = makeDemoPost({ ...input, format: "article", article: { title: "Título", body: "Corpo" }, reference: { type: "social_post", id: "original" } });
  assert.equal(article.authorId, "me");
  assert.equal(article.reference?.id, "original");
  assert.notEqual(article.id, "original");
});
test("menções/tags unicode são deduplicadas sem renderizar HTML", () => {
  assert.deepEqual(extractSocialTokens("@ana @ana #Café #café"), { mentions: ["ana"], hashtags: ["café"] });
  const article = makeDemoPost({ ...input, format: "article", article: { title: "Título", body: "<script>alert(1)</script>" } });
  assert.equal(article.article?.body, "<script>alert(1)</script>"); // UI renders plain text, never HTML.
});
test("curtidas nunca ficam negativas; duas alternâncias restauram contagem", () => {
  const initial = state();
  const liked = socialReducer(initial, { type: "TOGGLE_LIKE", postId: post.id });
  assert.equal(liked.posts[0].likes, 1);
  assert.equal(socialReducer(liked, { type: "TOGGLE_LIKE", postId: post.id }).posts[0].likes, 0);
  initial.posts = [{ ...post, likes: 0, isLiked: true }];
  assert.equal(socialReducer(initial, { type: "TOGGLE_LIKE", postId: post.id }).posts[0].likes, 0);
});
test("repost referencia original sem duplicá-lo; desfazer restaura distribuição", () => {
  const first = socialReducer(state(), { type: "TOGGLE_REPOST", postId: post.id, actorId: "me" });
  assert.equal(first.posts.length, 1);
  assert.equal(first.posts[0].authorId, post.authorId);
  assert.equal(first.repostEntries[0].postId, post.id);
  assert.equal(first.repostEntries[0].authorId, "me");
  const undone = socialReducer(first, { type: "TOGGLE_REPOST", postId: post.id, actorId: "me" });
  assert.equal(undone.repostEntries.length, 0);
  assert.equal(undone.posts[0].reposts, 0);
});
test("comentário/resposta pertencem ao mesmo post e não duplicam contagens", () => {
  const comment = makeDemoComment(post.id, "Comentário", "me");
  const first = socialReducer(state(), { type: "ADD_COMMENT", comment });
  const duplicate = socialReducer(first, { type: "ADD_COMMENT", comment });
  assert.equal(duplicate.posts[0].comments, 1);
  assertCommentParent([comment], post.id, comment.id);
  assert.throws(() => assertCommentParent([comment], "outro-post", comment.id));
  assert.throws(() => assertCommentParent([comment], post.id, post.id));
  const reply = makeDemoComment(post.id, "Resposta", "u1", comment.id);
  assert.equal(reply.replyToCommentId, comment.id);
});
test("excluir remove comentários e reposts, sem apagar outro conteúdo", () => {
  const initial = socialReducer(state(), { type: "ADD_COMMENT", comment: makeDemoComment(post.id, "Comentário", "me") });
  const reposted = socialReducer(initial, { type: "TOGGLE_REPOST", postId: post.id, actorId: "me" });
  const deleted = socialReducer(reposted, { type: "DELETE_POST", postId: post.id });
  assert.equal(deleted.posts.length + deleted.postComments.length + deleted.repostEntries.length, 0);
});
test("privacidade distingue público, círculo e dono", () => {
  assert.equal(canReadPost({ ...post, audience: "private" }, "visitante", true), false);
  assert.equal(canReadPost({ ...post, audience: "private" }, "me", false), true);
  assert.equal(canReadPost({ ...post, audience: "circles" }, "visitante", false), false);
  assert.equal(canReadPost({ ...post, audience: "circles" }, "visitante", true), true);
});
test("resolvedor não inventa entidade e preserva destinos originais", async () => {
  const snapshot = { users: mockUsers, posts: [post], reviews: [], viewerId: "me" };
  const seek = await resolveReference({ type: "seek_entity", id: "biz3" }, snapshot);
  assert.equal(seek?.targetPath, "/profile/cafecentralsp");
  assert.equal(seek?.rating, undefined);
  const shop = await resolveReference({ type: "shop_item", id: "p1" }, snapshot);
  assert.equal(shop?.targetPath, "/shop/item/p1");
  assert.equal(await resolveReference({ type: "seek_entity", id: "ausente" }, snapshot), null);
  assert.equal((await resolveReference({ type: "seek_entity", id: "event:e1" }, snapshot))?.targetPath, "/seek/event/e1");
  assert.equal(await resolveReference({ type: "seek_entity", id: "e1" }, snapshot), null);
  const reference = { type: "shop_item" as const, id: "p1" };
  assert.equal(resolveReference(reference, snapshot), resolveReference(reference, snapshot));
});
test("referência privada não vaza título; referências inválidas são rejeitadas", async () => {
  const privatePost = { ...post, audience: "private" as const };
  assert.equal(await resolveReference({ type: "social_post", id: post.id }, { users: [{ ...mockUsers[0], id: "me" }], posts: [privatePost], reviews: [], viewerId: "other" }), null);
  await assert.rejects(resolveReference({ type: "invalid", id: "id" } as never, { users: [], posts: [], reviews: [] }));
});
test("REST trata 401/403/404/409/422/5xx e falha de rede explicitamente", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 403, 404, 409, 422, 500]) {
      globalThis.fetch = async () => new Response(null, { status });
      await assert.rejects(apiRequest("/api/proposto"), error => (error as { status: number }).status === status);
    }
    globalThis.fetch = async () => { throw new Error("offline"); };
    await assert.rejects(apiRequest("/api/proposto"), error => (error as { status: number }).status === 0);
    globalThis.fetch = async () => Response.json({ sucesso: true });
    await assert.rejects(restContentAdapter.createPost(input), error => (error as { status: number }).status === 502);
  } finally { globalThis.fetch = original; }
});
