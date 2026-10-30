import { test } from "node:test";
import "./seekDiscovery.test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  makeDemoPost,
  makeDemoComment,
  extractSocialTokens,
  validatePublication,
  canReadPost,
  assertCommentParent,
} from "../src/modules/social/application/contentValidation";
import { apiRequest } from "../src/modules/social/services/socialHttp";
import { restContentAdapter } from "../src/modules/social/services/restContentService";
import { resolveReference } from "../src/modules/app/content/referenceResolver";
import {
  canHydrateDevelopmentPreview,
  createInitialState,
  mergeDevelopmentPreviewState,
  socialReducer,
  type SocialState,
} from "../src/modules/app/state/socialApplicationState";
import { selectSocialView } from "../src/modules/social/application/selectSocialView";
import {
  followRequestIdsBetween,
  removeFollowEdgesForBlock,
} from "../src/modules/social/domain/followRelationships";
import { mockUsers, currentUser } from "../src/data/mockData";
import { formatCount, formatTimeAgo } from "../src/lib/formatters";
import type { PublishPostInput } from "../src/types/content";
import { validateMediaFiles } from "../src/modules/social/services/mediaService";
import { saveStoredSeekReviews } from "../src/modules/seek/data/reviewStorage";
import { myAccountToUser } from "../src/modules/social/services/socialGraphApi";
import type { MyAccountResponse } from "@workspace/api-client-react";
import {
  accountStorageKey,
  readAccountScopedIds,
  readAccountScopedIdsMap,
  writeAccountScopedIds,
} from "../src/modules/app/persistence/browserAccountStorage";
import { saveStoredFollowRequests } from "../src/modules/social/data/followRequestStorage";
import { getAccountBlockProjection } from "../src/modules/social/application/blockProjection";
import {
  getStoredAccounts,
  saveSocialAccount,
} from "../src/modules/profile/data/accountStorage";
import {
  getAccountActivity,
  readAccountActivityMap,
  saveAccountActivityMap,
  updateAccountActivity,
} from "../src/modules/app/persistence/accountActivityStorage";

const input: PublishPostInput = {
  content: "Minha opinião #café",
  authorId: "me",
  audience: "public",
};
const post = makeDemoPost(input);
const state = (): SocialState => ({
  posts: [post],
  remotePosts: [],
  users: mockUsers,
  conversations: [],
  messages: [],
  notifications: [],
  reviews: [],
  postComments: [],
  repostEntries: [],
  followRequests: [],
});
test("perfil comercial autenticado é hidratado da resposta privada do proprietário", () => {
  const ownerResponse: MyAccountResponse = {
    account: {
      id: "5d7e0d74-4fd2-4a78-9861-5113a70be8de",
      username: "cafe_teste",
      displayName: "Café Teste",
      bio: "",
      avatarUrl: null,
      coverUrl: null,
      location: null,
      website: null,
      accountType: "commercial",
      isPrivate: false,
      joinedAt: "2026-10-24T00:00:00.000Z",
      relationship: {
        following: "none",
        inCircle: false,
        blockedByMe: false,
        blockedByThem: false,
        mutedByMe: false,
      },
      stats: { posts: 0, followers: 0, following: 0, circles: 0 },
      version: 1,
    },
    firstName: null,
    lastName: null,
    commercialProfile: {
      categoryKey: "cafes",
      discoveryKind: "place",
      address: "Rua de Teste, 100",
      postalCode: "01001000",
      cityName: "São Paulo",
      stateName: "SP",
      countryName: "Brasil",
    },
  };
  const user = myAccountToUser(ownerResponse);
  assert.equal(user.accountType, "commercial");
  assert.equal("age" in user, false);
  assert.equal(user.address, "Rua de Teste, 100");
  assert.equal(user.city, "São Paulo");
  assert.equal(user.location, "São Paulo, SP");
  assert.equal(user.commercialProfile?.category, "Cafés");
  assert.equal(user.commercialProfile?.discoveryKind, "place");
  assert.deepEqual(user.commercialProfile?.serviceOptions, undefined);
});

test("datas e contagens usam português e toleram valores inválidos", () => {
  assert.equal(
    formatTimeAgo(new Date(Date.now() - 90_000).toISOString()),
    "há 1 min",
  );
  assert.equal(
    formatTimeAgo(new Date(Date.now() + 60_000).toISOString()),
    "agora",
  );
  assert.equal(formatTimeAgo("inválida"), "Data indisponível");
  assert.match(formatCount(1200), /1,2\s*mil/);
  assert.equal(formatCount(-1), "0");
  assert.equal(formatCount(Number.NaN), "0");
});
test("a hidratação da prévia preserva dados locais já existentes sem duplicar ids", () => {
  const preview = state();
  preview.posts = [{ ...post, id: "demo-post" }];
  const current = state();
  current.posts = [
    { ...post, id: "demo-post", content: "alteração local" },
    { ...post, id: "local-post" },
  ];

  const merged = mergeDevelopmentPreviewState(current, preview);

  assert.deepEqual(
    merged.posts.map((entry) => entry.id),
    ["demo-post", "local-post"],
  );
  assert.equal(merged.posts[0].content, "alteração local");
});
test("fixtures só podem ser hidratadas em build de desenvolvimento com prévia ativa", () => {
  assert.equal(canHydrateDevelopmentPreview(false, false), false);
  assert.equal(canHydrateDevelopmentPreview(false, true), false);
  assert.equal(canHydrateDevelopmentPreview(true, false), false);
  assert.equal(canHydrateDevelopmentPreview(true, true), true);

  const contextSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx",
    ),
    "utf8",
  );
  assert.match(
    contextSource,
    /canHydrateDevelopmentPreview\(import\.meta\.env\.DEV,\s*isDevelopmentPreview\)/,
  );
});
test("sessão remota ignora dados sociais do navegador sem apagá-los", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
      },
    },
  });
  try {
    saveSocialAccount(mockUsers[0]);
    saveStoredFollowRequests([
      {
        id: "local-request",
        requesterId: "local-requester",
        targetId: "local-target",
        createdAt: "2026-10-27T12:00:00.000Z",
      },
    ]);
    saveStoredSeekReviews([
      {
        id: "local-review",
        businessAccountId: "local-business",
        reviewerId: "local-reviewer",
        rating: 5,
        comment: "Demonstração",
        createdAt: "2026-10-27T12:00:00.000Z",
      },
    ]);

    const remoteState = createInitialState(false);
    assert.deepEqual(remoteState.users, []);
    assert.deepEqual(remoteState.followRequests, []);
    assert.deepEqual(remoteState.reviews, []);

    const previewState = createInitialState(true);
    assert.deepEqual(
      previewState.users.map((user) => user.id),
      [mockUsers[0].id],
    );
    assert.deepEqual(
      previewState.followRequests.map((request) => request.id),
      ["local-request"],
    );
    assert.deepEqual(
      previewState.reviews.map((review) => review.id),
      ["local-review"],
    );
    assert.ok(storage.size > 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("atividade local agregada não altera contagens de uma sessão remota", () => {
  const targetPost = { ...post, id: "aggregate-post", likes: 4, reposts: 2 };
  const targetComment = {
    id: "aggregate-comment",
    postId: targetPost.id,
    authorId: "author",
    content: "comentário",
    createdAt: "2026-10-27T12:00:00.000Z",
    likes: 3,
  };
  const localActivity = {
    likedPostIds: [targetPost.id],
    likedCommentIds: [targetComment.id],
    bookmarkedPostIds: [],
    reposts: [
      {
        id: "local-repost",
        postId: targetPost.id,
        authorId: "local-account",
        createdAt: "2026-10-27T12:01:00.000Z",
      },
    ],
  };
  const baseInput = {
    posts: [targetPost],
    comments: [targetComment],
    repostEntries: [],
    users: [],
    followRequests: [],
    viewer: null,
    blockedUserIds: new Set<string>(),
    accountsBlockingViewerIds: new Set<string>(),
    blockedAccountIds: new Set<string>(),
    accountActivity: {
      likedPostIds: [],
      likedCommentIds: [],
      bookmarkedPostIds: [],
      reposts: [],
    },
    accountActivities: [localActivity],
  };

  const remoteView = selectSocialView({
    ...baseInput,
    isRemoteSocialSession: true,
  });
  assert.equal(remoteView.posts[0].likes, 4);
  assert.equal(remoteView.posts[0].reposts, 2);
  assert.equal(remoteView.comments[0].likes, 3);
  assert.equal(remoteView.repostEntries.length, 0);

  const previewView = selectSocialView({
    ...baseInput,
    isRemoteSocialSession: false,
  });
  assert.equal(previewView.posts[0].likes, 5);
  assert.equal(previewView.posts[0].reposts, 3);
  assert.equal(previewView.comments[0].likes, 4);
  assert.equal(previewView.repostEntries.length, 1);
});
test("conta de exemplo usa a identidade atual sem website fictício", () => {
  assert.equal(currentUser.username, "usuario_demo");
  assert.equal(currentUser.displayName, "Minha conta");
  assert.equal(currentUser.website, undefined);
});
test("mídias rejeitam arquivos vazios, formatos inválidos, excesso e tamanhos acima do limite", () => {
  const photo = new File(["foto"], "foto.jpg", { type: "image/jpeg" });
  assert.doesNotThrow(() => validateMediaFiles([photo], "image"));
  assert.throws(() =>
    validateMediaFiles(
      [new File([], "vazio.jpg", { type: "image/jpeg" })],
      "image",
    ),
  );
  assert.throws(() =>
    validateMediaFiles(
      [new File(["svg"], "vetor.svg", { type: "image/svg+xml" })],
      "image",
    ),
  );
  assert.throws(() => validateMediaFiles([photo], "video"));
  assert.throws(() => validateMediaFiles(Array(9).fill(photo), "image"));
  assert.throws(() =>
    validateMediaFiles(
      [{ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 } as File],
      "image",
    ),
  );
  assert.throws(() =>
    validateMediaFiles(
      [{ type: "video/mp4", size: 100 * 1024 * 1024 + 1 } as File],
      "video",
    ),
  );
});
test("falha de armazenamento de avaliação não simula sucesso", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        setItem() {
          throw new Error("QuotaExceededError");
        },
      },
    },
  });
  try {
    assert.throws(
      () => saveStoredSeekReviews([]),
      /Não foi possível salvar a avaliação/,
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("ações sociais locais ficam isoladas por conta e sobrevivem à releitura do navegador", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
        get length() {
          return storage.size;
        },
        key(index: number) {
          return [...storage.keys()][index] ?? null;
        },
      },
    },
  });
  try {
    assert.notEqual(
      accountStorageKey("saved", "conta-a"),
      accountStorageKey("saved", "conta-b"),
    );
    let activities = readAccountActivityMap();
    activities = updateAccountActivity(activities, "conta-a", (current) => ({
      ...current,
      likedPostIds: ["post-1"],
    }));
    activities = updateAccountActivity(activities, "conta-b", (current) => ({
      ...current,
      bookmarkedPostIds: ["post-1"],
    }));
    assert.equal(saveAccountActivityMap(activities), true);

    const reloaded = readAccountActivityMap();
    assert.deepEqual(getAccountActivity(reloaded, "conta-a").likedPostIds, [
      "post-1",
    ]);
    assert.deepEqual(
      getAccountActivity(reloaded, "conta-a").bookmarkedPostIds,
      [],
    );
    assert.deepEqual(getAccountActivity(reloaded, "conta-b").likedPostIds, []);
    assert.deepEqual(
      getAccountActivity(reloaded, "conta-b").bookmarkedPostIds,
      ["post-1"],
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("bloqueios locais são relações isoladas entre conta e perfil alvo", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
        get length() {
          return storage.size;
        },
        key(index: number) {
          return [...storage.keys()][index] ?? null;
        },
      },
    },
  });
  try {
    writeAccountScopedIds("seekalive-blocked-users", "conta-a", ["perfil-b"]);
    writeAccountScopedIds("seekalive-blocked-users", "conta-b", ["perfil-c"]);
    assert.deepEqual(
      readAccountScopedIds("seekalive-blocked-users", "conta-a"),
      ["perfil-b"],
    );
    assert.deepEqual(
      readAccountScopedIds("seekalive-blocked-users", "conta-b"),
      ["perfil-c"],
    );
    assert.deepEqual(readAccountScopedIdsMap("seekalive-blocked-users"), {
      "conta-a": ["perfil-b"],
      "conta-b": ["perfil-c"],
    });
    const accountAView = getAccountBlockProjection(
      readAccountScopedIdsMap("seekalive-blocked-users"),
      "conta-a",
    );
    const accountBView = getAccountBlockProjection(
      readAccountScopedIdsMap("seekalive-blocked-users"),
      "perfil-b",
    );
    assert.deepEqual(accountAView.unavailableAccountIds, ["perfil-b"]);
    assert.deepEqual(accountBView.unavailableAccountIds, ["conta-a"]);
    assert.deepEqual(accountBView.blockedByViewerIds, []);
    assert.deepEqual(accountBView.blockingViewerIds, ["conta-a"]);
    writeAccountScopedIds("seekalive-blocked-users", "conta-a", []);
    assert.deepEqual(
      getAccountBlockProjection(
        readAccountScopedIdsMap("seekalive-blocked-users"),
        "perfil-b",
      ).unavailableAccountIds,
      [],
    );
    assert.notEqual(
      accountStorageKey("seekalive-blocked-users", "conta-a"),
      accountStorageKey("seekalive-blocked-users", "conta-b"),
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("bloquear rompe seguimentos e Círculo nos dois sentidos sem afetar outras relações", () => {
  const actor = {
    ...currentUser,
    id: "conta-a",
    followingIds: ["conta-b", "conta-c"],
    stats: { posts: 0, followers: 3, following: 2, circles: 1 },
  };
  const target = {
    ...mockUsers[0],
    id: "conta-b",
    followingIds: ["conta-a"],
    stats: { posts: 0, followers: 1, following: 1, circles: 1 },
  };
  const result = removeFollowEdgesForBlock(actor, target);
  assert.deepEqual(result.actor.followingIds, ["conta-c"]);
  assert.deepEqual(result.target.followingIds, []);
  assert.deepEqual(result.actor.stats, {
    posts: 0,
    followers: 2,
    following: 1,
    circles: 0,
  });
  assert.deepEqual(result.target.stats, {
    posts: 0,
    followers: 0,
    following: 0,
    circles: 0,
  });
  assert.equal(result.changed, true);
});
test("bloquear cancela solicitações pendentes nas duas direções", () => {
  const requests = [
    {
      id: "a-para-b",
      requesterId: "conta-a",
      targetId: "conta-b",
      createdAt: "",
    },
    {
      id: "b-para-a",
      requesterId: "conta-b",
      targetId: "conta-a",
      createdAt: "",
    },
    {
      id: "a-para-c",
      requesterId: "conta-a",
      targetId: "conta-c",
      createdAt: "",
    },
  ];
  assert.deepEqual(followRequestIdsBetween(requests, "conta-a", "conta-b"), [
    "a-para-b",
    "b-para-a",
  ]);
});
test("perfis bloqueados usam o visitante ativo e oferecem desbloqueio", () => {
  const socialSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx",
    ),
    "utf8",
  );
  const socialViewSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/social/application/selectSocialView.ts",
    ),
    "utf8",
  );
  const messageSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/messages/application/selectVisibleMessages.ts",
    ),
    "utf8",
  );
  const blockedPageSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/settings/screens/Blocked.tsx",
    ),
    "utf8",
  );
  const blockActionsSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/social/application/blockActions.ts",
    ),
    "utf8",
  );
  const profileSource = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/profile/screens/Profile.tsx",
    ),
    "utf8",
  );
  assert.match(
    socialSource,
    /useAccountScopedIds\("seekalive-blocked-users", actorId\)/,
  );
  assert.match(
    socialViewSource,
    /isBlockedByViewer:\s*blockedUserIds\.has\(user\.id\)/,
  );
  assert.match(
    socialViewSource,
    /blocksViewer:\s*!isRemoteSocialSession\s*&&\s*accountsBlockingViewerIds\.has\(user\.id\)/,
  );
  assert.match(
    socialViewSource,
    /isBlocked:\s*blockedUserIds\.has\(user\.id\)/,
  );
  assert.match(
    blockActionsSource,
    /removeFollowEdgesForBlock\(viewer, target\)/,
  );
  assert.match(
    blockActionsSource,
    /followRequestIdsBetween\(\s*state\.followRequests,\s*viewer\.id,\s*userId,\s*\)/,
  );
  assert.match(
    messageSource,
    /conversation\.participantIds\.some\(\(id\) => id !== actorId && blockedAccountIds\.has\(id\)\)/,
  );
  assert.match(blockedPageSource, /unblockUser\(userId\)/);
  assert.match(blockedPageSource, /isBlockedByViewer/);
  assert.doesNotMatch(blockedPageSource, /disabled/);
  assert.match(profileSource, /blockUser\(user\.id\)/);
  assert.doesNotMatch(profileSource, /Bloquear também/);
});
test("seguimentos escolhidos no onboarding permanecem vinculados à conta no navegador", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          storage.set(key, value);
        },
      },
    },
  });
  try {
    saveSocialAccount({
      ...currentUser,
      id: "onboarding-a",
      username: "conta_a",
      followingIds: ["u1"],
    });
    saveSocialAccount({
      ...currentUser,
      id: "onboarding-b",
      username: "conta_b",
      followingIds: ["u2", "u3"],
    });
    const accounts = getStoredAccounts();
    assert.deepEqual(
      accounts.find((account) => account.id === "onboarding-a")?.followingIds,
      ["u1"],
    );
    assert.deepEqual(
      accounts.find((account) => account.id === "onboarding-b")?.followingIds,
      ["u2", "u3"],
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
test("data de nascimento é coletada no cadastro, mas não exibida após a criação da conta", () => {
  const registrationDateOfBirthField = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/auth/components/registration/RegistrationDateOfBirthField.tsx",
    ),
    "utf8",
  );
  const accountSettings = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/settings/screens/Account.tsx",
    ),
    "utf8",
  );
  assert.match(
    registrationDateOfBirthField,
    /data-testid="input-date-of-birth"/,
  );
  assert.doesNotMatch(
    accountSettings,
    /draft\.(?:age|dateOfBirth)|\b(?:Idade|Data de nascimento)\b/i,
  );
});
test("alteração de nome de usuário sincroniza as fontes da conta e do Social", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "Aplicativo/front/src/modules/settings/screens/Account.tsx",
    ),
    "utf8",
  );
  const usernameHandler =
    source
      .split("async function submitUsername")[1]
      ?.split("const disabled =")[0] ?? "";
  const syncHandler =
    source
      .split("function syncUpdatedUser")[1]
      ?.split("async function submitProfile")[0] ?? "";
  assert.match(
    usernameHandler,
    /socialGraphApi\.updateMyAccount\(\{\s*username: nextUsername,\s*version: remoteProfile\.account\.version,/s,
  );
  assert.match(
    usernameHandler,
    /syncUpdatedUser\(\{\s*\.\.\.currentUser,\s*username: nextUsername\s*\}\);/,
  );
  assert.match(syncHandler, /updateAccount\(user\);\s*updateUser\(user\);/);
});
test("marca Elo usa Seekalive e o mesmo símbolo no app e favicon", () => {
  const root = join(process.cwd(), "Aplicativo/front");
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /<title>Seekalive<\/title>/);
  assert.match(html, /apple-touch-icon/);
  for (const file of [
    "modules/app/layouts/Header.tsx",
    "modules/app/layouts/SocialDesktopHeader.tsx",
    "modules/social/components/SocialDrawer.tsx",
    "modules/auth/screens/Login.tsx",
    "modules/auth/screens/Register.tsx",
    "modules/app/screens/Splash.tsx",
  ]) {
    const source = readFileSync(join(root, "src", file), "utf8");
    assert.match(source, /<BrandMark/);
    assert.match(source, /Seekalive/);
    assert.doesNotMatch(source, /SeekAlive/);
  }
  const mark = readFileSync(
    join(root, "src/components/brand/BrandMark.tsx"),
    "utf8",
  );
  const favicon = readFileSync(join(root, "public/favicon.svg"), "utf8");
  const paths = (source: string) =>
    [...source.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(paths(mark).length, 2);
  assert.deepEqual(paths(mark), paths(favicon));
});

test("mover menu não remove Social nem troca os destinos da barra inferior", () => {
  const root = join(process.cwd(), "Aplicativo/front/src");
  const bottom = readFileSync(
    join(root, "modules/app/layouts/BottomNav.tsx"),
    "utf8",
  );
  const sidebar = readFileSync(
    join(root, "modules/social/components/SocialSidebar.tsx"),
    "utf8",
  );
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
  const root = join(process.cwd(), "Aplicativo/front/src");
  const violations: string[] = [];
  function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (/comunidad|communit/i.test(entry.name)) violations.push(path);
      if (entry.isDirectory()) inspect(path);
      else if (
        /\.(tsx?|css|json)$/.test(entry.name) &&
        /comunidad|communit/i.test(readFileSync(path, "utf8"))
      )
        violations.push(path);
    }
  }
  inspect(root);
  assert.deepEqual(violations, []);
});
test("não publica vazio, mídia incoerente nem artigo sem título/corpo", () => {
  for (const value of [
    { ...input, content: "" },
    { ...input, format: "article" as const },
    {
      ...input,
      format: "article" as const,
      article: { title: "", body: "corpo" },
    },
    { ...input, mediaUrls: ["blob:foto"], mediaTypes: [] },
    { ...input, content: "x".repeat(281) },
  ])
    assert.throws(() => validatePublication(value));
});
test("mídia sem legenda e artigo com referência preservam autoria", () => {
  assert.equal(
    makeDemoPost({
      ...input,
      content: "",
      mediaUrls: ["blob:foto"],
      mediaTypes: ["image"],
    }).format,
    "media",
  );
  const article = makeDemoPost({
    ...input,
    format: "article",
    article: { title: "Título", body: "Corpo" },
    reference: { type: "social_post", id: "original" },
  });
  assert.equal(article.authorId, "me");
  assert.equal(article.reference?.id, "original");
  assert.notEqual(article.id, "original");
});
test("menções/tags unicode são deduplicadas sem renderizar HTML", () => {
  assert.deepEqual(extractSocialTokens("@ana @ana #Café #café"), {
    mentions: ["ana"],
    hashtags: ["café"],
  });
  const article = makeDemoPost({
    ...input,
    format: "article",
    article: { title: "Título", body: "<script>alert(1)</script>" },
  });
  assert.equal(article.article?.body, "<script>alert(1)</script>"); // UI renders plain text, never HTML.
});
test("curtidas nunca ficam negativas; duas alternâncias restauram contagem", () => {
  const initial = state();
  const liked = socialReducer(initial, {
    type: "TOGGLE_LIKE",
    postId: post.id,
  });
  assert.equal(liked.posts[0].likes, 1);
  assert.equal(
    socialReducer(liked, { type: "TOGGLE_LIKE", postId: post.id }).posts[0]
      .likes,
    0,
  );
  initial.posts = [{ ...post, likes: 0, isLiked: true }];
  assert.equal(
    socialReducer(initial, { type: "TOGGLE_LIKE", postId: post.id }).posts[0]
      .likes,
    0,
  );
});
test("repost referencia original sem duplicá-lo; desfazer restaura distribuição", () => {
  const first = socialReducer(state(), {
    type: "TOGGLE_REPOST",
    postId: post.id,
    actorId: "me",
  });
  assert.equal(first.posts.length, 1);
  assert.equal(first.posts[0].authorId, post.authorId);
  assert.equal(first.repostEntries[0].postId, post.id);
  assert.equal(first.repostEntries[0].authorId, "me");
  const undone = socialReducer(first, {
    type: "TOGGLE_REPOST",
    postId: post.id,
    actorId: "me",
  });
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
  const initial = socialReducer(state(), {
    type: "ADD_COMMENT",
    comment: makeDemoComment(post.id, "Comentário", "me"),
  });
  const reposted = socialReducer(initial, {
    type: "TOGGLE_REPOST",
    postId: post.id,
    actorId: "me",
  });
  const deleted = socialReducer(reposted, {
    type: "DELETE_POST",
    postId: post.id,
  });
  assert.equal(
    deleted.posts.length +
      deleted.postComments.length +
      deleted.repostEntries.length,
    0,
  );
});
test("privacidade distingue aprovados, Círculo, público e dono", () => {
  assert.equal(
    canReadPost({ ...post, audience: "private" }, "visitante", true),
    false,
  );
  assert.equal(
    canReadPost({ ...post, audience: "private" }, "me", false),
    true,
  );
  assert.equal(
    canReadPost({ ...post, audience: "circles" }, "visitante", false),
    false,
  );
  assert.equal(
    canReadPost({ ...post, audience: "circles" }, "visitante", true),
    true,
  );
  assert.equal(
    canReadPost(
      { ...post, audience: "public" },
      "visitante",
      false,
      true,
      false,
    ),
    false,
  );
  assert.equal(
    canReadPost(
      { ...post, audience: "public" },
      "visitante",
      false,
      true,
      true,
    ),
    true,
  );
  assert.equal(
    canReadPost(
      { ...post, audience: "circles" },
      "visitante",
      false,
      true,
      true,
    ),
    false,
  );
  assert.equal(
    canReadPost(
      { ...post, audience: "circles" },
      "visitante",
      true,
      true,
      true,
    ),
    true,
  );
  assert.equal(
    canReadPost(
      { ...post, audience: "private" },
      "visitante",
      true,
      true,
      true,
    ),
    false,
  );
});
test("solicitação de seguimento é única por par e pode ser removida", () => {
  const request = {
    id: "request-1",
    requesterId: "u1",
    targetId: "u2",
    createdAt: new Date().toISOString(),
  };
  const added = socialReducer(state(), { type: "ADD_FOLLOW_REQUEST", request });
  const duplicate = socialReducer(added, {
    type: "ADD_FOLLOW_REQUEST",
    request: { ...request, id: "request-2" },
  });
  assert.equal(duplicate.followRequests.length, 1);
  assert.deepEqual(
    socialReducer(duplicate, {
      type: "REMOVE_FOLLOW_REQUEST",
      requestId: request.id,
    }).followRequests,
    [],
  );
});
test("resolvedor não inventa entidade e preserva destinos originais", async () => {
  const snapshot = {
    users: mockUsers,
    posts: [post],
    reviews: [],
    viewerId: "me",
  };
  const seek = await resolveReference(
    { type: "seek_entity", id: "biz3" },
    snapshot,
  );
  assert.equal(seek?.targetPath, "/profile/cafecentralsp");
  assert.equal(seek?.rating, undefined);
  const shop = await resolveReference(
    { type: "shop_item", id: "p1" },
    snapshot,
  );
  assert.equal(shop?.targetPath, "/shop/item/p1");
  assert.equal(
    await resolveReference({ type: "seek_entity", id: "ausente" }, snapshot),
    null,
  );
  assert.equal(
    (await resolveReference({ type: "seek_entity", id: "event:e1" }, snapshot))
      ?.targetPath,
    "/seek/event/e1",
  );
  assert.equal(
    await resolveReference({ type: "seek_entity", id: "e1" }, snapshot),
    null,
  );
  const reference = { type: "shop_item" as const, id: "p1" };
  assert.equal(
    resolveReference(reference, snapshot),
    resolveReference(reference, snapshot),
  );
});
test("referência privada não vaza título; referências inválidas são rejeitadas", async () => {
  const privatePost = { ...post, audience: "private" as const };
  assert.equal(
    await resolveReference(
      { type: "social_post", id: post.id },
      {
        users: [{ ...mockUsers[0], id: "me" }],
        posts: [privatePost],
        reviews: [],
        viewerId: "other",
      },
    ),
    null,
  );
  await assert.rejects(
    resolveReference({ type: "invalid", id: "id" } as never, {
      users: [],
      posts: [],
      reviews: [],
    }),
  );
});
test("REST trata 401/403/404/409/422/5xx e falha de rede explicitamente", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 403, 404, 409, 422, 500]) {
      globalThis.fetch = async () => new Response(null, { status });
      await assert.rejects(
        apiRequest("/api/proposto"),
        (error) => (error as { status: number }).status === status,
      );
    }
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    await assert.rejects(
      apiRequest("/api/proposto"),
      (error) => (error as { status: number }).status === 0,
    );
    globalThis.fetch = async (input) =>
      String(input).endsWith("/api/v1/auth/csrf")
        ? Response.json({ csrfToken: "test-csrf-token" })
        : Response.json({ sucesso: true });
    await assert.rejects(
      restContentAdapter.createPost(input),
      (error) => (error as { status: number }).status === 502,
    );
  } finally {
    globalThis.fetch = original;
  }
});
