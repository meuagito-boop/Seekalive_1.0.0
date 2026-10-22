import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { makeDemoPost, makeDemoComment, makeDemoMessage, extractSocialTokens, validatePublication, canReadPost, assertCommentParent } from "../src/services/contentValidation";
import { apiRequest, restContentAdapter } from "../src/services/contentService";
import { resolveReference } from "../src/services/referenceResolver";
import { socialReducer, type SocialState } from "../src/context/SocialContext";
import { mockUsers, mockNotifications, currentUser, formatCount, formatTimeAgo } from "../src/data/mockData";
import type { PublishPostInput } from "../src/types/content";
import { validateMediaFiles } from "../src/services/mediaService";
import { filterSeekBusinesses, matchesSeekSearch } from "../src/lib/seekFilters";
import { saveStoredSeekReviews } from "../src/data/reviewStorage";

const input: PublishPostInput = { content: "Minha opinião #café", authorId: "me", audience: "public" };
const post = makeDemoPost(input);
const state = (): SocialState => ({ posts: [post], users: mockUsers, conversations: [], messages: [], notifications: [], reviews: [], postComments: [], repostEntries: [] });
test("datas e contagens usam português e toleram valores inválidos", () => {
  assert.equal(formatTimeAgo(new Date(Date.now() - 90_000).toISOString()), "há 1 min");
  assert.equal(formatTimeAgo(new Date(Date.now() + 60_000).toISOString()), "agora");
  assert.equal(formatTimeAgo("inválida"), "Data indisponível");
  assert.match(formatCount(1200), /1,2\s*mil/);
  assert.equal(formatCount(-1), "0");
  assert.equal(formatCount(Number.NaN), "0");
});
test("conta de exemplo usa a identidade atual sem website fictício", () => {
  assert.equal(currentUser.username, "usuario_demo");
  assert.equal(currentUser.displayName, "Minha conta");
  assert.equal(currentUser.website, undefined);
});
test("mídias rejeitam arquivos vazios, formatos inválidos, excesso e tamanhos acima do limite", () => {
  const photo = new File(["foto"], "foto.jpg", { type: "image/jpeg" });
  assert.doesNotThrow(() => validateMediaFiles([photo], "image"));
  assert.throws(() => validateMediaFiles([new File([], "vazio.jpg", { type: "image/jpeg" })], "image"));
  assert.throws(() => validateMediaFiles([new File(["svg"], "vetor.svg", { type: "image/svg+xml" })], "image"));
  assert.throws(() => validateMediaFiles([photo], "video"));
  assert.throws(() => validateMediaFiles(Array(9).fill(photo), "image"));
  assert.throws(() => validateMediaFiles([{ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 } as File], "image"));
  assert.throws(() => validateMediaFiles([{ type: "video/mp4", size: 100 * 1024 * 1024 + 1 } as File], "video"));
});
test("falha de armazenamento de avaliação não simula sucesso", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { setItem() { throw new Error("QuotaExceededError"); } } },
  });
  try {
    assert.throws(() => saveStoredSeekReviews([]), /Não foi possível salvar a avaliação/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("Seek busca sem acentos e combina categoria, nota, status, distância e ordenação", () => {
  assert.ok(matchesSeekSearch(["Café Central", "São Paulo"], " cafe  sao "));
  assert.equal(matchesSeekSearch(["Café Central"], "bar"), false);
  const businesses = [
    { name: "Café Central", username: "cafe", bio: "", category: "Cafés", categoryKey: "cafes", address: "São Paulo", tags: [], open: true, rating: 4.5, distanceKm: 2 },
    { name: "Bar", username: "bar", bio: "", category: "Bares", categoryKey: "bares", address: "São Paulo", tags: [], open: false, rating: 5, distanceKm: 1 },
    { name: "Sem distância", username: "sem", bio: "", category: "Cafés", categoryKey: "cafes", address: "", tags: [], rating: 3 },
  ];
  const filters = { query: "", category: null, onlyOpen: false, minimumRating: 0, maxDistance: 0, nearest: false };
  assert.deepEqual(filterSeekBusinesses(businesses, filters).map(b => b.username), ["bar", "cafe", "sem"]);
  assert.deepEqual(filterSeekBusinesses(businesses, { ...filters, query: "cafe sao", onlyOpen: true, minimumRating: 4, maxDistance: 5, category: "cafes" }).map(b => b.username), ["cafe"]);
  assert.equal(filterSeekBusinesses(businesses, { ...filters, maxDistance: 1 }).length, 1);
  assert.equal(filterSeekBusinesses(businesses, { ...filters, minimumRating: 4.9, onlyOpen: true }).length, 0);
  assert.deepEqual(filterSeekBusinesses(businesses, { ...filters, nearest: true }).map(b => b.username), ["bar", "cafe", "sem"]);
  assert.equal(businesses[0].username, "cafe"); // Does not mutate the shared account list.
});
test("mensagens respeitam a conta participante e preservam remetente e conversa", () => {
  const conversation = { id: "conversa-local", participantIds: ["conta-criada", "u1"], unreadCount: 1, createdAt: new Date().toISOString() };
  const message = makeDemoMessage(conversation, "conta-criada", "  Olá!  ");
  assert.equal(message.senderId, "conta-criada");
  assert.equal(message.content, "Olá!");
  const initial = { ...state(), conversations: [conversation] };
  const sent = socialReducer(initial, { type: "SEND_MESSAGE", message });
  assert.equal(sent.messages[0].senderId, "conta-criada");
  assert.equal(sent.conversations[0].lastMessage?.id, message.id);
  assert.equal(socialReducer(sent, { type: "SEND_MESSAGE", message }).messages.length, 1);
  for (const author of [undefined, "outra-conta"]) assert.throws(() => makeDemoMessage(conversation, author, "Olá"));
  assert.throws(() => makeDemoMessage(undefined, "conta-criada", "Olá"));
  assert.throws(() => makeDemoMessage(conversation, "conta-criada", " "));
});
test("notificações contêm apenas recursos mantidos no aplicativo", () => {
  const allowed = new Set(["follow", "circle_request", "circle_accepted", "like", "comment", "repost", "mention"]);
  assert.ok(mockNotifications.every(notification => allowed.has(notification.type)));
});
test("marca Elo usa Seekalive e o mesmo símbolo no app e favicon", () => {
  const root = join(process.cwd(), "artifacts/social");
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /<title>Seekalive<\/title>/);
  assert.match(html, /apple-touch-icon/);
  for (const file of ["components/layout/Header.tsx", "components/layout/SocialDesktopHeader.tsx", "components/social/SocialDrawer.tsx", "pages/Login.tsx", "pages/Register.tsx", "pages/Splash.tsx"]) {
    const source = readFileSync(join(root, "src", file), "utf8");
    assert.match(source, /<BrandMark/);
    assert.match(source, /Seekalive/);
    assert.doesNotMatch(source, /SeekAlive/);
  }
  const mark = readFileSync(join(root, "src/components/brand/BrandMark.tsx"), "utf8");
  const favicon = readFileSync(join(root, "public/favicon.svg"), "utf8");
  const paths = (source: string) => [...source.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths(mark).length, 2);
  assert.deepEqual(paths(mark), paths(favicon));
});

test("mover menu não remove Social nem troca os destinos da barra inferior", () => {
  const root = join(process.cwd(), "artifacts/social/src");
  const bottom = readFileSync(join(root, "components/layout/BottomNav.tsx"), "utf8");
  const sidebar = readFileSync(join(root, "components/social/SocialSidebar.tsx"), "utf8");
  assert.match(bottom, /href="\/seek" aria-label="Seek"/);
  assert.match(bottom, /href="\/feed" aria-label="Social"/);
  assert.match(bottom, /href="\/shop"/);
  assert.match(bottom, /aria-label="Abrir menu"/);
  assert.match(bottom, /aria-label="Criar"/);
  assert.match(bottom, /<DialogTitle>Criar<\/DialogTitle>/);
  assert.doesNotMatch(bottom, /searchHref|Buscar no Social/);
  assert.doesNotMatch(sidebar, /<SectionLabel>Explorar<\/SectionLabel>/);
});
test("comunidades não retornam em rotas, páginas, dados ou navegação", () => {
  const root = join(process.cwd(), "artifacts/social/src");
  const violations: string[] = [];
  function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (/comunidad|communit/i.test(entry.name)) violations.push(path);
      if (entry.isDirectory()) inspect(path);
      else if (/\.(tsx?|css|json)$/.test(entry.name) && /comunidad|communit/i.test(readFileSync(path, "utf8"))) violations.push(path);
    }
  }
  inspect(root);
  assert.deepEqual(violations, []);
});
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
