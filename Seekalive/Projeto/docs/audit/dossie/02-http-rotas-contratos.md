# 02 — Entrada HTTP, rotas e contratos

## Método e limites

Inventário estático das rotas Express montadas e dos contratos OpenAPI/Markdown. A comparação normalizou o prefixo `/api` aplicado pelo servidor e os parâmetros Express `:id` para os parâmetros OpenAPI `{id}`. A única chamada HTTP adicional foi `OPTIONS` de preflight em endpoint de login no domínio de desenvolvimento, sem envio de credenciais ou mutação.

## Achados

### 02-001 — A API montada contém sete áreas registradas, não todo o conjunto anunciado pelo produto

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `Seekalive/Projeto/Aplicativo/back/src/modules/index.ts:13–19` monta `health`, `/v1/auth`, `/v1/onboarding`, `/v1` (Profiles), `/v1/social` (Social, Media e Feed): sete áreas quando cada domínio funcional é contado separadamente. O mesmo arquivo não registra roteadores de Seek, Shop, mensagens, notificações ou Trust & Safety.

```ts
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);
router.use("/v1", accountsRouter);
router.use("/v1/social", relationsRouter);
router.use("/v1/social", createMediaRouter(readFeedPost));
router.use("/v1/social", feedRouter);
```

**Impacto:** Uma rota declarada apenas no OpenAPI não está disponível no servidor. As áreas ausentes são identificadas como não implementadas/registradas, não como funcionalidades prontas.

### 02-002 — O servidor expõe 76 operações HTTP no código atual

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** Extração estática de `router.get/post/put/patch/delete` em `Aplicativo/back/src/modules/**/*.ts`, combinada com os `router.use` em `modules/index.ts`. Prefixo HTTP efetivo: `app.use("/api", router)` em `Aplicativo/back/src/app.ts:50`.

**Inventário constatado:**

```text
Health
GET /api/healthz
GET /api/readyz

Auth
POST /api/v1/auth/register
GET /api/v1/auth/csrf
POST /api/v1/auth/login
POST /api/v1/auth/device-verification/confirm
POST /api/v1/auth/device-verification/resend
POST /api/v1/auth/verification
POST /api/v1/auth/verification/confirm
POST /api/v1/auth/password/reset/request
POST /api/v1/auth/password/reset/confirm
POST /api/v1/auth/password/update
POST /api/v1/auth/password/update/confirm
GET /api/v1/auth/session
GET /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/others
DELETE /api/v1/auth/sessions/:sessionId
POST /api/v1/auth/logout
GET /api/v1/auth/devices
DELETE /api/v1/auth/devices/others
DELETE /api/v1/auth/devices/:deviceId
POST /api/v1/auth/account/email/change/request
POST /api/v1/auth/account/email/change/confirm-current
POST /api/v1/auth/account/email/change/confirm-new
POST /api/v1/auth/account/password/change/request
POST /api/v1/auth/account/password/change/confirm
POST /api/v1/auth/account/deletion/code
POST /api/v1/auth/account/deletion/confirm
POST /api/v1/auth/account/deletion/restore/code
POST /api/v1/auth/account/deletion/restore/confirm

Onboarding
POST /api/v1/onboarding/interests

Profiles
GET /api/v1/accounts/availability
GET /api/v1/accounts/me
PATCH /api/v1/accounts/me
GET /api/v1/accounts/me/privacy
PUT /api/v1/accounts/me/privacy
GET /api/v1/profiles/:username
GET /api/v1/accounts/:accountId
GET /api/v1/profiles/:username/reviews
POST /api/v1/profiles/:username/reviews
DELETE /api/v1/profiles/:username/reviews/me
PUT /api/v1/profiles/:username/reviews/:reviewId/reply

Social relations
GET /api/v1/social/accounts
GET /api/v1/social/accounts/:accountId/followers
GET /api/v1/social/accounts/:accountId/following
PUT /api/v1/social/accounts/:accountId/follow
DELETE /api/v1/social/accounts/:accountId/follow
GET /api/v1/social/follow-requests
POST /api/v1/social/follow-requests/:accountId/accept
POST /api/v1/social/follow-requests/:accountId/decline
GET /api/v1/social/circles
GET /api/v1/social/blocks
PUT /api/v1/social/blocks/:accountId
DELETE /api/v1/social/blocks/:accountId

Feed
GET /api/v1/social/feed
GET /api/v1/social/posts/:postId
POST /api/v1/social/posts
DELETE /api/v1/social/posts/:postId
GET /api/v1/social/posts/:postId/reference
POST /api/v1/social/posts/:postId/repost
DELETE /api/v1/social/posts/:postId/repost
PUT /api/v1/social/posts/:postId/like
DELETE /api/v1/social/posts/:postId/like
PUT /api/v1/social/posts/:postId/bookmark
DELETE /api/v1/social/posts/:postId/bookmark
GET /api/v1/social/posts/:postId/comments
POST /api/v1/social/posts/:postId/comments
DELETE /api/v1/social/comments/:commentId
PUT /api/v1/social/comments/:commentId/like
DELETE /api/v1/social/comments/:commentId/like
POST /api/v1/social/articles
GET /api/v1/social/articles/:postId
GET /api/v1/social/accounts/:accountId/posts

Media
POST /api/v1/social/media
GET /api/v1/social/media/:assetId
DELETE /api/v1/social/media/:assetId
```

**Limite:** Esse inventário prova a existência de declarações e montagens Express, não a correção funcional de cada handler nem o resultado de uma chamada autenticada.

### 02-003 — O contrato OpenAPI ativo diverge do servidor em quatro operações

**Veredito:** CONTRADITO  
**Prioridade:** Crítica

**Evidência:** `shared/api-spec/openapi.yaml:7–9` define `servers.url: /api`; `shared/api-spec/orval.config.ts:59–75` usa esse arquivo e configura o cliente com `baseUrl: "/api"`. Comparação estática normalizada encontrou 74 operações no OpenAPI ativo e 76 rotas no código: três rotas só no código e uma divergência de método. `docs/api/backend/README.md:13–18` esclarece que `docs/api/backend/openapi.json` é catálogo amplo com propostas, não a fonte ativa; por isso suas 146 operações não foram tratadas como 146 handlers que deveriam existir.

**Três rotas presentes no servidor e ausentes do contrato ativo:**

```text
GET   /readyz
GET   /v1/accounts/availability
POST  /v1/onboarding/interests
```

**Divergência de método no mesmo caminho:**

```text
Contrato ativo: POST /v1/social/accounts/{accountId}/posts
Servidor:       GET  /api/v1/social/accounts/:accountId/posts
```

**Impacto:** O cliente gerado não descreve três rotas realmente servidas, e a listagem de publicações por conta tem método diferente entre contrato e handler. O catálogo amplo de propostas continua útil para planejamento, mas não é evidência de implementação.

### 02-004 — A tabela de endpoints deixa 18 rotas montadas fora do conjunto marcado como ativo

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** A leitura tabular integral de `docs/api/backend/endpoints.md` encontrou 146 operações: 54 `ATIVA`, 88 `PROPOSTA` e quatro `IMPLEMENTADA EM CÓDIGO; BANCO PENDENTE`. As 54 ativas têm handler correspondente. Entre as 76 rotas montadas, 11 estão rotuladas `PROPOSTA` e sete caminhos não aparecem na tabela. O README (`docs/api/backend/README.md:13–18`) explica que o catálogo inclui propostas; contudo, essas 11 rotas propostas estão registradas no Express e não há feature flag no ponto de montagem.

**Onze rotas montadas que continuam marcadas como proposta:**

```text
GET    /v1/social/feed
GET    /v1/social/posts/{postId}/comments
POST   /v1/social/posts/{postId}/comments
DELETE /v1/social/posts/{postId}
POST   /v1/social/posts/{postId}/repost
DELETE /v1/social/posts/{postId}/repost
PUT    /v1/social/posts/{postId}/like
DELETE /v1/social/posts/{postId}/like
PUT    /v1/social/comments/{commentId}/like
DELETE /v1/social/comments/{commentId}/like
```

**Impacto:** A tabela não pode ser interpretada como “o que o servidor efetivamente expõe”: há rotas propostas acessíveis pelo roteador e rotas expostas sem linha correspondente. A presença de handler não comprova validação ou prontidão para produção.

### 02-005 — As avaliações comerciais estão expostas e corretamente rotuladas como dependentes do banco

**Veredito:** CONFIRMADO  
**Prioridade:** Crítica

**Evidência:** `Aplicativo/back/src/modules/profiles/presentation/businessProfileReviewRoutes.ts` declara GET, POST, DELETE e PUT; `shared/api-spec/openapi.yaml` contém essas operações; `docs/api/backend/endpoints.md:86–89` as marca `IMPLEMENTADA EM CÓDIGO; BANCO PENDENTE`. O catálogo do banco de desenvolvimento não contém `profiles.business_profile_reviews` (consulta de catálogo; ver bloco 05).

**Impacto:** O estado documentado confere com a ausência física da tabela, mas as rotas estão montadas no servidor. A leitura do repositório da rota no bloco 05 deverá determinar o efeito da chamada quando a tabela não existe; nenhuma requisição de negócio foi feita.

### 02-006 — O parser global aceita e decodifica o corpo antes de autenticação, CSRF e rate limit de cada rota

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `Aplicativo/back/src/app.ts:40–50` instala `cookieParser`, os parsers JSON de 32 KB/256 KB, `express.urlencoded` e só depois monta `/api`.

```ts
app.use(cookieParser());
const defaultJsonParser = express.json({ limit: "32kb" });
const articleJsonParser = express.json({ limit: "256kb" });
app.use((request, response, next) => { /* seleciona parser pelo caminho */ });
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
```

**Risco:** Rotas de escrita protegidas por autenticação ou CSRF ainda fazem parse do corpo sem essas proteções anteriores. Os limites de tamanho reduzem a superfície, mas não eliminam o custo de parse e alocação para chamadas anônimas. Isso não foi submetido a teste de carga.

### 02-007 — Rotas de mudança de e-mail/senha escapam do `Cache-Control: no-store` aplicado ao restante do router de Auth

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `Aplicativo/back/src/modules/auth/presentation/routes.ts:16–20` registra `/account` antes do middleware `no-store`:

```ts
router.use("/account", accountSecurityRouter);
router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
```

`accountSecurityRoutes.ts:7–8` monta as rotas de mudança de e-mail e senha nesse subrouter. Busca estática por `Cache-Control` nas rotas Auth encontrou apenas esse middleware e o middleware independente de `accountDeletionRoutes.ts:23`.

**Risco:** Respostas das rotas de alteração de credenciais não recebem o `no-store` central. Não foi observado cabeçalho equivalente no subrouter.

### 02-008 — O registro de erros mantém status HTTP separado e atribui números de domínio exclusivos

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** `shared/contracts/src/errorCodes.ts:1–14` separa famílias HTTP e de domínio. `:19–34` contém status HTTP; `:36–102` contém números de erro de aplicação nas famílias 1000/1100/1200/1300/1400/1800. `:104–118` verifica unicidade das duas listas ao carregar o módulo. `Aplicativo/back/src/common/apiErrors.ts:14–22` devolve `status` HTTP e `code`, `key`, `message`, `requestId` no corpo.

**Resultado estático:** Nenhum número duplicado foi encontrado no catálogo atual. As famílias Seek, Shop e Trust & Safety estão reservadas, embora seus módulos não estejam registrados no servidor.

### 02-009 — Os handlers validam entradas em vários pontos, mas quase não validam respostas contra schemas compartilhados

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** Busca estática de `safeParse`, `.parse`, `ResponseSchema` e `validateResponse` em `Aplicativo/back/src` encontrou validação de corpos/params e dados internos; o único parse explícito de resposta localizado foi `HealthCheckResponse.parse` em `health/presentation/livenessRoutes.ts:7`. Os demais handlers retornam objetos por `response.json(...)`.

**Limite da conclusão:** A geração de tipos do cliente reduz alguns erros de compilação, mas não valida em runtime que o objeto construído pelo servidor respeite o contrato. Não foi executada geração de contratos ou compilação.

### 02-010 — O código não configura CORS ou um conjunto completo de cabeçalhos de segurança HTTP

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `Aplicativo/back/package.json:17` declara `cors`, porém busca por `cors(`, Helmet e cabeçalhos de segurança em `Aplicativo/back/src` encontrou apenas `X-Content-Type-Options` em `modules/media/presentation/mediaRoutes.ts:205`. `app.ts:10–13` cria o Express e define somente `trust proxy=false`. O `HEAD /api/readyz` de desenvolvimento retornou `x-powered-by: Express` e não incluiu CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy ou X-Content-Type-Options. O preflight `OPTIONS` de desenvolvimento retornou 204, `Access-Control-Allow-Methods` e `Access-Control-Allow-Headers`, sem `Access-Control-Allow-Origin`.

**Limite da conclusão:** Parte dos cabeçalhos observados pode ser responsabilidade de um proxy externo, não configurado no código. O domínio avaliado é apenas o preview de desenvolvimento; a camada de produção não foi acessada.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 6 |
| PARCIAL | 2 |
| CONTRADITO | 2 |
| NÃO VERIFICADO | 0 |

**Próximo bloco:** Autenticação, sessões e desafios. A comparação de contratos e rotas deverá ser retomada no bloco 12 sem tratar operações futuras do OpenAPI como implementadas.
