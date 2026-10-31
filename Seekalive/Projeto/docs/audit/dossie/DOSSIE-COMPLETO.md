# Índice do dossiê técnico

**Projeto:** Seekalive  
**Data de referência:** 31/10/2026  
**Ambiente:** desenvolvimento. Produção não foi acessada nem avaliada.
**Escopo:** auditoria adversarial e somente leitura conforme `attached_assets/prompt-dossie-seekalive_1793434053209.md`.

**Limites respeitados:** sem alterações em código, schema, dependências, configuração ou dados; sem testes, builds, typechecks, lint, geração, migrations, `push`, seed, requisições HTTP de escrita, acesso à produção, leitura de segredos, logs de execução ou tabelas de negócio. SQL limitado a catálogos do banco de desenvolvimento e `EXPLAIN` sem `ANALYZE`, com parâmetros fictícios. As alterações foram restritas aos arquivos deste dossiê.

## Estado do levantamento

| Bloco | Tema | Estado |
|---|---|---|
| 01 | Repositório, plataforma e configuração | Concluído — inclui limitações explícitas |
| 02 | Pipeline HTTP, rotas e contratos | Concluído — matriz por rota parcial, achado 02-012 |
| 03 | Autenticação e sessão | Concluído — pontos prioritários verificados estaticamente |
| 04 | Autorização e privacidade | Concluído — sem testes dinâmicos de permissão |
| 05 | Banco de desenvolvimento e migrations | Concluído — drift total e estado de ledger não verificados |
| 06 | Consultas e desempenho | Concluído — planos representativos, não todas as formas |
| 07 | Transações e concorrência | Concluído — races não executadas |
| 08 | Mídia | Concluído — sem teste de carga, disco ou cache externo |
| 09 | E-mail e processamento assíncrono | Concluído — sem envio real |
| 10 | Configuração e observabilidade | Concluído — sem valores de ambiente ou observabilidade externa |
| 11 | Rate limit e abuso | Concluído — sem carga ou múltiplas instâncias |
| 12 | Frontend e integração com API | Concluído — sem navegação visual/E2E |
| 13 | Dados pessoais e ciclo de exclusão | Concluído — sem executar purge |
| 14 | Testes e qualidade | Concluído — inventário estático, testes não executados |
| 99 | Síntese, lacunas e plano recomendado | Concluído |

“Concluído” significa que o bloco foi documentado e suas lacunas foram classificadas; não significa que todos os comportamentos foram validados nem que o aplicativo esteja pronto para produção.

## Resumo dos vereditos

| Veredito | Achados |
|---|---:|
| CONFIRMADO | 72 |
| PARCIAL | 60 |
| CONTRADITO | 15 |
| NÃO VERIFICADO | 16 |
| **Total** | **163** |

Contagem deduplicada: blocos 01–14 e apêndices A1/A2, cada um uma vez. O bloco 99 apenas referencia achados existentes. O cálculo detalhado está em `99-sintese-lacunas.md`.

## Arquivos oficiais do dossiê

- `00-indice.md`
- `01-repositorio-plataforma.md`
- `02-http-rotas-contratos.md`
- `03-autenticacao-sessoes.md`
- `04-perfis-privacidade-relacoes.md`
- `05-banco-migrations-integridade.md`
- `06-feed-publicacoes-visibilidade.md`
- `07-transacoes-concorrencia.md`
- `08-midias-upload-armazenamento.md`
- `09-email-processamento-assincrono.md`
- `10-configuracao-observabilidade.md`
- `11-limites-de-taxa-abuso.md`
- `12-frontend-integracao-api.md`
- `13-ciclo-de-vida-exclusao-conta.md`
- `14-testes-cobertura-e-validacao.md`
- `11-fronteiras-dominios-modulos.md` — Apêndice A1, não é o bloco oficial 11.
- `12-documentos-contratos-e-decisoes.md` — Apêndice A2, não é o bloco oficial 12.
- `99-sintese-lacunas.md`
- `DOSSIE-COMPLETO.md` — concatenação dos arquivos oficiais e apêndices na ordem indicada.

## Verificações não executadas

Não foram executados testes automatizados, testes de browser, build, typecheck, lint ou auditoria de dependências; não foram iniciados nem reiniciados workflows. O estado do banco é exclusivamente o catálogo de desenvolvimento observado, não uma confirmação de operação funcional completa.


---

# 01 — Repositório, plataforma e configuração

## Método e limites

Inspeção estática de manifests, lockfile, configuração de execução e nomes de variáveis. O servidor de desenvolvimento existente foi consultado apenas com `HEAD`; nenhum processo foi iniciado ou reiniciado. Segredos foram tratados como nomes de variáveis somente.

## Achados

### 01-001 — A árvore separa aplicações, infraestrutura e contratos, mas isso não prova coesão de cada domínio

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `find . -maxdepth 2 -type d` executado em `Seekalive/Projeto` listou, entre outros, `Aplicativo/back`, `Aplicativo/front`, `infra/database`, `infra/cache`, `infra/queues`, `infra/storage`, `infra/deployment`, `shared/api-spec`, `shared/contracts`, `docs`, `auditoria`, `tests` e `scripts`. `pnpm-workspace.yaml:37–42` declara os grupos `Aplicativo/*`, `shared/*`, `infra/*`, `artifacts/*` e `scripts`.

**Leitura técnica:** A separação física de alto nível existe. Ela não confirma, por si só, que arquivos, dependências e regras estejam coesos dentro de cada domínio. Essa conclusão depende dos blocos de código e dependências seguintes; não se deve tratar a árvore como prova de arquitetura correta.

### 01-002 — A versão de Node declarada pelo repositório conflita com o runtime declarado no Replit

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `Seekalive/Projeto/package.json:5–8` declara `pnpm@10.26.1` e Node `>=22.18.0`. `.replit:1` declara `modules = ["nodejs-20"]`. O runtime observado somente por `node --version` foi `v22.23.4`; `pnpm --version` retornou `10.26.1`.

```text
package.json: "node": ">=22.18.0"
.replit: modules = ["nodejs-20"]
runtime observado: v22.23.4
```

**Risco:** O ambiente atualmente observado satisfaz o requisito do pacote, mas a configuração registrada do Replit aponta para Node 20. Uma reconstrução/instalação limpa pode selecionar runtime incompatível ou diferir do runtime atual. Nenhuma reconstrução foi executada para testar esse cenário.

### 01-003 — As versões principais observadas no lockfile estão alinhadas em Zod 4, Orval 8 e Drizzle ORM 0.45

**Veredito:** CONFIRMADO, limitado às entradas observadas  
**Prioridade:** Média

**Evidência:** `pnpm-lock.yaml` contém entradas resolvidas `argon2@0.45.1` (linha 1888), `drizzle-kit@0.31.10` (2041), `drizzle-orm@0.45.2` (2045), `express@5.3.0` (2223), `orval@8.44.0` (2547), `pino@9.14.0` (2646) e `zod@4.6.7` (3098). `Aplicativo/back/package.json:15–24` declara Express, Drizzle, Zod e demais dependências da API; `shared/api-spec/package.json:6–10` declara Orval `^8.44.0`; `pnpm-workspace.yaml:56–68` concentra Drizzle ORM e Zod no catálogo.

**Limite da conclusão:** A auditoria ainda não concluiu a busca de todas as versões transitivas de Zod nem verificou compatibilidade comportamental entre Orval, `drizzle-zod` e os schemas. Não se afirma ainda ausência total de versões duplicadas ou de conflitos.

### 01-004 — O script pós-merge instala dependências e verifica o pacote de banco; não foi executado

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** `Seekalive/Projeto/scripts/post-merge.sh:8–9`:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run check
```

**Risco/limite:** O script não executado não comprova que instalação, migrations ou checagem passem no ambiente atual. A auditoria foi instruída a não executar esse fluxo.

### 01-005 — Há proteção explícita contra `push` fora de um schema de teste isolado, mas ela depende de usar o wrapper

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `Seekalive/Projeto/infra/database/scripts/push-isolated.mjs:3–12` exige `NODE_ENV=test`, `SEEKALIVE_DB_SCHEMA` no formato `seekalive_test_<32 hex>` e `SEEKALIVE_DB_MIGRATION_TARGET=replit`; caso contrário, encerra com erro. `infra/database/package.json:26` aponta o script `push` para esse wrapper. `infra/database/drizzle.push.config.ts:6–19` define a configuração de `drizzle-kit push` e escolhe URL por `resolveDatabaseConnectionUrl`.

**Risco/limite:** A barreira está no script de pacote; a inspeção estática não prova que operadores ou automações não chamem diretamente `drizzle-kit push --config ./drizzle.push.config.ts`. Nenhum `push` foi executado.

### 01-006 — O alvo do banco de runtime pode cair em Replit por padrão; migrações exigem alvo explícito

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `Seekalive/Projeto/infra/database/src/connection.ts:24–35` escolhe `SEEKALIVE_DATABASE_TARGET` para runtime e `SEEKALIVE_DB_MIGRATION_TARGET` para migrations; quando runtime não define alvo, `connection.ts:28–32` fornece `"replit"` como padrão. O URL é selecionado entre `DATABASE_URL` e `SEEKALIVE_EXTERNAL_DATABASE_URL`, sem imprimir ou acessar o valor nesta auditoria. Migrações não têm default (`connection.ts:10–16`).

**Leitura técnica:** O caminho externo está preparado por variável de seleção, mas a conexão externa não foi validada nem usada. Isso não é evidência de que haja banco externo ou configuração de produção.

### 01-007 — O tipo de implantação e os valores efetivos de configuração não puderam ser confirmados

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Média

**Evidência:** `.replit:1–10` declara módulo Node, canal Nix e portas locais/externas; não contém bloco de implantação. O inventário de nomes encontrou variáveis de runtime, teste e Vite, incluindo `DATABASE_URL`, `SEEKALIVE_DATABASE_TARGET`, `SEEKALIVE_DB_MIGRATION_TARGET`, `SESSION_SECRET`, `RESEND_API_KEY`, `RESEND_ENABLED` e `RESEND_FROM_EMAIL`. Os valores não foram lidos. `Seekalive/Projeto/Aplicativo/back/package.json:6–10` define `dev`, `build`, `start` e `typecheck`; não define um script de deploy.

**Razão:** O prompt proíbe leitura de segredos e acesso à produção. A configuração visível não basta para determinar o ambiente de publicação, serviços gerenciados, domínios ou valores efetivamente ativos.

### 01-008 — O processo de execução local responde ao endpoint de prontidão, mas esse HEAD não valida as dependências funcionais

**Veredito:** PARCIAL  
**Prioridade:** Baixa

**Evidência:** Requisição permitida `HEAD https://$REPLIT_DEV_DOMAIN/api/readyz` retornou `HTTP/2 200`, `content-type: application/json`, `x-powered-by: Express` e `x-request-id`. O cabeçalho não contém `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` ou `X-Content-Type-Options`.

**Limite da conclusão:** Isso comprova apenas a resposta do endpoint de desenvolvimento naquele instante. Não comprova autenticação, banco, storage, integrações, funcionamento de fluxos nem o estado de produção. Os cabeçalhos observados serão tratados no bloco HTTP/segurança; não se extrapola para produção.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 3 |
| CONTRADITO | 1 |
| NÃO VERIFICADO | 1 |

**Pendências para a síntese:** confirmar todo o grafo de versões Zod/Orval; comparar workflows e variáveis documentadas com código; inspecionar os módulos restantes e a configuração do servidor.


---

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
DELETE /v1/social/comments/{commentId}
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

### 02-011 — Não há rotas de administração/moderação nem validação de papel administrativo no backend atual

**Afirmação da doc:** N/A — verificação da hipótese prioritária do prompt.

**Veredito:** CONFIRMADO
**Risco:** Informativo — essas funções ainda não estão implementadas, portanto não há mecanismo backend para gestão/moderação.

**Evidência:** O inventário completo de routers montados no bloco `02-001` não contém rotas administrativas. A busca estática `rg -n -i 'moderation|admin|role|isAdmin|require.*Role|authorize' Aplicativo/back/src/modules Aplicativo/back/src/security --glob '*.ts'` não retornou resultados.

**Trecho da saída:** nenhum match para termos de autorização administrativa nos diretórios pesquisados; as rotas registradas estão enumeradas em `02-002`.

### 02-012 — O inventário de rotas ainda não fecha a matriz individual de autenticação, schemas e resposta

**Afirmação da doc:** "Tabela de todas as rotas registradas: método, caminho, auth, CSRF, rate limit, papel exigido, schemas Zod de entrada e saída." (prompt de auditoria, seção 02)

**Veredito:** PARCIAL
**Evidência:** `02-002` registra método e caminho de 76 rotas; `11-001` enumera os 55 usos de limitador e `03`/`04` descrevem autenticação e predicados por grupo. Busca AST estática das declarações `router.get/post/put/patch/delete` identificou validação inline em parte dos handlers, mas não produziu uma matriz única por rota com sessão, CSRF, papel, schema de entrada e schema de resposta. `02-009` confirma que a validação de saída é rara.
**Risco:** Médio — a ausência da matriz dificulta revisão independente de cada endpoint e deixa diferenças de autorização/contrato menos visíveis.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 7 |
| PARCIAL | 3 |
| CONTRADITO | 2 |
| NÃO VERIFICADO | 0 |

**Próximo bloco:** Autenticação, sessões e desafios. A comparação de contratos e rotas deverá ser retomada no bloco 12 sem tratar operações futuras do OpenAPI como implementadas.


---

# 03 — Cadastro, autenticação, sessões e dispositivos

## Método e limites

Revisão estática do contrato compartilhado, serviços de aplicação, repositórios, rotas e schema do banco. Não foram criadas contas, solicitados códigos, feitas autenticações nem enviados e-mails. As regras de concorrência foram inferidas do SQL/Drizzle; não foram submetidas a testes paralelos.

## Achados

### 03-001 — A verificação de idade usa a data informada e calcula o limite no calendário de São Paulo

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `shared/contracts/src/auth.ts:7–27` exige `DD/MM/AAAA` e valida a existência da data. `Aplicativo/back/src/modules/accounts/domain/accountAgeEligibility.ts:10–18, 41–71` calcula a idade no fuso `America/Sao_Paulo`; `createRegistrationAccount.ts:30–36` impede a criação quando inelegível. A validação do schema usa componentes UTC apenas para conferir se o dia existe no calendário; a comparação da idade usa São Paulo.

```ts
const AGE_CALENDAR_TIME_ZONE = "America/Sao_Paulo";
...
const eligibility = assessAccountAge(
  registration.dateOfBirth,
  getCurrentDate(),
);
if (eligibility.kind === "ineligible") {
  return { kind: "age_ineligible", reason: eligibility.reason };
}
```

### 03-002 — O código adiciona idade máxima de 120 anos além do mínimo aprovado

**Veredito:** CONTRADITO  
**Prioridade:** Média

**Evidência:** `accountAgeEligibility.ts:69–71` rejeita idade inferior a 18 e superior a 120. A regra aprovada registrada pelo usuário define idade mínima de 18; não foi localizada decisão de idade máxima.

```ts
if (age < 18) return { kind: "ineligible", reason: "underage" };
if (age > 120) return { kind: "ineligible", reason: "over_age_limit" };
```

**Impacto:** Uma pessoa com data válida e idade superior a 120 não consegue se cadastrar. A intenção pode ser rejeitar datas evidentemente equivocadas, mas isso não está formalizado como política.

### 03-003 — A data de nascimento não é persistida, mas a idade calculada é armazenada

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** O fluxo de Auth converte `dateOfBirth` em `eligibility.age` (`createRegistrationAccount.ts:30–58`) e não encaminha a data original. `accounts/infrastructure/accountRegistrationRepository.ts:52–60` grava `age` na tabela Accounts. Uma busca estática por `accounts.age` e `age:` em `Aplicativo/back/src/modules` e `shared/contracts/src` encontrou uso da idade apenas durante o cadastro; não encontrou campo `age` nas respostas desses módulos.

```ts
.values({
  username: input.username,
  age: input.age,
  acceptedTermsVersion: input.acceptedTermsVersion,
  accountType: input.accountType,
  status: "pending_verification",
})
```

**Impacto:** A data exata não fica armazenada, mas a idade capturada no cadastro é um dado pessoal derivado e envelhece com o tempo. Não foi encontrada resposta pública com esse campo. A necessidade de reter esse valor após concluir a verificação de 18 anos não está justificada no código.

### 03-004 — A criação divide dados de conta, credencial e perfil, mas depende de uma única transação entre domínios

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `auth/composition/registration.ts:1–17` compõe o cadastro com `Accounts`, Auth e inicializadores de `Profiles`. `registrationAccountCoordinator.ts:37–80` executa a criação da identidade, credencial e perfis dentro do mesmo `runInTransaction`; cada inicializador recebe a mesma `DatabaseTransaction`.

```ts
return dependencies.runInTransaction(async (transaction) => {
  const account = await dependencies.createPendingAccountIdentity(transaction, ...);
  await dependencies.createInitialPasswordCredential(transaction, ...);
  await dependencies.initializeAccountProfile(transaction, account.id, ...);
  if (input.accountType === "commercial") {
    await dependencies.initializeCommercialProfile(transaction, account.id, ...);
  }
});
```

**Avaliação:** A propriedade lógica está razoavelmente separada: Accounts cria identidade/e-mail; Auth cria credencial; Profiles inicializa o perfil. Porém, a atomicidade depende de todos os domínios compartilharem uma conexão transacional. Quando cada domínio tiver banco físico próprio, essa transação única não pode ser preservada sem uma estratégia explícita de coordenação distribuída. A conexão física futura não foi configurada nem testada.

### 03-005 — Autenticação é própria, sem Clerk, e usa Argon2id e sessões opacas no servidor

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `Aplicativo/back/src/modules/auth/application/passwordHashing.ts:3–12` usa Argon2id, custo de memória 65.536 KiB, três iterações e paralelismo 1. `sessionMaterial.ts:6–18` gera token aleatório de 32 bytes e grava hash do token, não o token bruto. `sessionConfig.ts:1–10` exige `SESSION_SECRET` com pelo menos 32 bytes. A busca por SDK/integração Clerk em código e manifests não encontrou uso.

```ts
const ARGON2ID_OPTIONS = {
  type: argon2.argon2id as 2,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};
```

**Limite:** Esta é uma leitura de implementação, não uma validação de resistência por benchmark, pentest ou teste de carga.

### 03-006 — A senha segue as regras aprovadas; cadastro comercial também exige campos de descoberta

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `shared/contracts/src/auth.ts:29–36` exige 8–128 caracteres, maiúscula, minúscula, número e caractere especial; o hashing é Argon2id (03-005). `:47–73` define os dois tipos de conta; o tipo comercial exige também `categoryKey`, `discoveryKind`, endereço, CEP, cidade, estado e país.

```ts
.min(8).max(128)
.regex(/\p{Lu}/u)
.regex(/\p{Ll}/u)
.regex(/\p{N}/u)
.regex(/[\p{P}\p{S}]/u);
```

**Impacto:** A política de senha coincide com a regra aprovada. Os dois campos adicionais de descoberta são parte obrigatória do cadastro comercial; devem estar representados no formulário e descritos como exigências, não como dados opcionais.

### 03-007 — Uma conta com e-mail não verificado não obtém sessão

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `authenticateLogin.ts:75–80` retorna `email_not_verified` para conta pendente ou e-mail sem `verifiedAt`. `loginRoutes.ts:49–56` devolve erro 403 e declara que nenhuma sessão foi criada. O desafio de verificação expira em 10 minutos e permite cinco tentativas (`emailVerification/policy.ts:1–2`).

### 03-008 — Novo navegador/instalação é reconhecido por token revogável, não por IP ou identificador físico

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `startDeviceVerification.ts:30–35` gera 32 bytes aleatórios, armazena o hash e envia um código. `authenticateLogin.ts:55–59, 92–95` valida token de 43 caracteres e procura o hash no banco. `confirmDeviceLogin.ts:116–120` cadastra o hash como dispositivo confiável. O token é transportado no cookie HttpOnly/Secure/SameSite (`sessionCookies.ts:27–32`). Uma busca por colunas/campos de IP nos fluxos Auth e schemas não encontrou persistência de IP para identificar sessão ou dispositivo.

**Interpretação:** O mecanismo reconhece uma instalação daquele navegador que conserva o cookie. Não identifica hardware físico de celular ou computador, nem persiste IP como identidade do aparelho. Isso corresponde à definição aprovada de token revogável, mas o produto deve chamar a entidade de “dispositivo/instalação reconhecida”, não alegar identificação física.

### 03-009 — O código de novo dispositivo tem prazo, limite de tentativas e atrasos de reenvio definidos

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `challenges/deviceLogin.ts:6–9` define validade de 10 minutos, três tentativas, intervalo inicial de 30 segundos e intervalo final de 90 segundos. `loginRoutes.ts:110–152` solicita o código somente após senha correta e dispositivo desconhecido; a resposta mostra o e-mail mascarado e os horários do desafio.

### 03-010 — A terceira falha de código bloqueia a conta e revoga todas as sessões e instalações confiáveis

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `confirmDeviceLogin.ts:76–103` bloqueia na terceira tentativa incorreta. `deviceVerificationRepository.ts:140–181` define `securityLockedAt`, revoga sessões e dispositivos e consome os demais desafios de login daquele titular. As rotas devolvem 423 e orientam procurar suporte (`deviceVerificationRoutes.ts:56–62`).

**Risco de disponibilidade:** A política está implementada conforme a decisão do usuário, mas cria um bloqueio total de conta. Quem conhece a senha válida pode iniciar um desafio para instalação não reconhecida e errar os três códigos, provocando bloqueio e revogação. A limitação por IP é local ao processo; mitigação distribuída e operação de desbloqueio não foram validadas neste bloco.

### 03-011 — O limite de duas sessões simultâneas e a revogação da mais antiga estão implementados

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `application/sessions/sessionPolicy.ts:1–14` define máximo de duas e seleciona as mais antigas para revogação. `sessionCreationRepository.ts:21–61` bloqueia a linha da conta, lista sessões ativas em ordem determinística, revoga as necessárias e insere a nova dentro da transação.

**Limite:** A correção sob concorrência foi avaliada pelo fluxo de locks, mas não houve teste paralelo no banco.

### 03-012 — A sessão tem expiração absoluta de sete dias por padrão, incompatível com “sem limite de inatividade”

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `security/sessionConfig.ts:12–16` define sete dias como padrão e permite configurar de 60 segundos até 30 dias. `sessionMaterial.ts:6–18` calcula `expiresAt` uma vez na criação. `activeSession.ts:39–43` rejeita sessão vencida; a busca estática de atualizações de `sessions.expiresAt` não encontrou renovação por atividade.

**Impacto:** A sessão expira após prazo contado da criação, mesmo com uso ativo. Isso não equivale a expiração por inatividade e conflita com a decisão registrada de não impor limite temporal à sessão.

### 03-013 — O cookie de instalação confiável expira após 400 dias, não apenas quando revogado

**Veredito:** CONTRADITO  
**Prioridade:** Média

**Evidência:** `security/sessionConfig.ts:1–4` define `DEVICE_COOKIE_MAX_AGE_MS` como 400 dias. `sessionCookies.ts:27–32` aplica esse `maxAge`; os únicos pontos de gravação localizados são login e confirmação do novo dispositivo. Não foi encontrada renovação periódica do cookie durante uso.

**Impacto:** Uma instalação sem novo login por mais de 400 dias perde o token no navegador e precisa passar novamente pela confirmação por e-mail, embora a regra aprovada seja manter o dispositivo reconhecido até revogação.

### 03-014 — Configurações permitem revogar sessões e dispositivos, mas mostram poucos dados para distingui-los

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `sessionRoutes.ts:94–101` retorna ID, datas e indicação da sessão atual. `trustedDeviceManagementRepository.ts:7–22` retorna ID, `createdAt` e `lastSeenAt`. Nenhuma dessas respostas fornece nome da instalação, tipo de aparelho ou localização/IP. As rotas também permitem revogar uma sessão ou dispositivo específico e os demais.

**Impacto:** A revogação existe, mas o titular precisa inferir a qual computador/celular cada registro corresponde pelas datas. O backend não possui metadados suficientes para apresentar um rótulo reconhecível; isso não deve ser preenchido com IP sem decisão específica.

### 03-015 — Troca e redefinição de senha revogam sessões e dispositivos; alteração de e-mail mantém duas confirmações e avisa o endereço antigo

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** A troca de senha exige senha atual e código, e revoga sessões/dispositivos (`passwordChange/requestPasswordChange.ts:35–63`; `confirmPasswordChange.ts:71–86`). A redefinição também revoga ambos (`confirmPasswordReset.ts:77–92`). A alteração de e-mail pede senha atual, código no e-mail atual e, depois, código no novo endereço (`startEmailChange.ts:37–60`; `confirmCurrentEmailChange.ts:55–104`); somente após a confirmação nova atualiza o e-mail e envia aviso ao antigo (`confirmNewEmailChange.ts:81–130`).

**Limite:** A entrega dos e-mails não foi testada nesta auditoria.

### 03-016 — Tentativas de verificação de e-mail usam lock de linha em transação, não incremento SQL atômico

**Afirmação da doc:** N/A — verificação da hipótese prioritária sobre `auth_challenges.attempts`.

**Veredito:** PARCIAL
**Risco:** Médio — o padrão serializa o fluxo observado, mas não há teste concorrente que confirme o limite em corrida.

**Evidência:** `emailVerificationRepository.ts:76–101` executa a operação dentro de `db.transaction` e lê o desafio `verify_email` com `.for("update")`. `confirmEmailVerification.ts:59–62` passa `challenge.attempts + 1`; o repositório grava esse valor absoluto em `:104–120`, em vez de fazer `attempts = attempts + 1` no SQL. As chamadas que seguem esse caminho ficam serializadas pelo lock da linha; não foi encontrado teste de confirmações paralelas.

**Trecho:** `.for("update")`; em seguida `.set({ attempts })` com condições de desafio não consumido, não expirado e abaixo do máximo.

### 03-017 — Contas pendentes de verificação não têm TTL ou purga automática identificada

**Afirmação da doc:** N/A — verificação da hipótese prioritária sobre contas não verificadas.

**Veredito:** PARCIAL
**Risco:** Médio — identidade, nome de usuário e e-mail podem permanecer reservados após o desafio expirar.

**Evidência:** `emailVerification/policy.ts:1–2` dá TTL de dez minutos ao código. `accountRegistrationRepository.ts` cria a conta com `status: "pending_verification"`; o fluxo de verificação muda esse estado para `active` (`emailVerificationRepository.ts:153–163`). Busca estática de `pending_verification` e remoção de contas encontrou a purga somente para `deletion_retained` no worker de exclusão, não uma limpeza de contas pendentes.

**Trecho da saída:** os caminhos de criação e ativação existem; não foi encontrado job/consulta que apague `accounts.status = "pending_verification"` após expirar o código.

### 03-018 — O hashing Argon2id não tem limite global de concorrência no código da aplicação

**Afirmação da doc:** N/A — verificação da hipótese prioritária de exaustão de recursos.

**Veredito:** PARCIAL
**Risco:** Alto sob tráfego concorrente — cada hash usa 65.536 KiB de memória e não há semáforo/fila global visível.

**Evidência:** `application/passwordHashing.ts:3–12` configura Argon2id com `memoryCost: 65_536` e chama diretamente `argon2.hash`. Cadastro, troca de senha, redefinição e atualização de senha chamam esse serviço. Busca por semáforo, fila ou limitador global de hashing no backend não encontrou mecanismo correspondente. Não foi feito benchmark nem teste de concorrência.

**Trecho:** `return argon2.hash(password, ARGON2ID_OPTIONS);`.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 8 |
| PARCIAL | 7 |
| CONTRADITO | 3 |
| NÃO VERIFICADO | 0 |

**Próximo bloco:** Profiles, privacidade, seguidores, Círculo, bloqueios e avaliações comerciais.


---

# 04 — Profiles, privacidade e relações sociais

## Método e limites

Revisão estática dos serviços, regras de domínio, repositórios e rotas de Profiles/Social/Feed. Nenhuma conta ou conteúdo de usuário foi consultado no banco. Não foram executadas chamadas de escrita, nem testes de permissões.

## Achados

### 04-001 — Perfil privado exige seguimento aprovado; Círculo continua sendo seguimento mútuo

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `profiles/domain/profileVisibility.ts:1–9` permite conteúdo privado ao titular ou a quem tem seguimento aceito. `social/domain/relationshipView.ts:17–30` define Círculo somente quando o seguimento do visitante é aceito e há seguimento recíproco. `feed/application/postVisibility.ts:26–35` aplica essas regras a publicações privadas e de Círculo.

```ts
if (!isPrivate) return true;
return viewerId === profileOwnerId || following === "accepted";
...
inCircle: following === "accepted" && state.reciprocalFollow,
```

**Resultado:** A pessoa aprovada vê o conteúdo de perfil privado; o status de Círculo não se torna recíproco só por aprovação de seguimento.

### 04-002 — Bloquear remove as relações bilaterais e desbloquear não as recria

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `social/infrastructure/blockMutationRepository.ts:9–30` cria o bloqueio e remove seguimentos e pedidos pendentes nos dois sentidos. `:34–42` remove apenas o bloqueio ao desbloquear. `profiles/application/publicProfile.ts:55–57, 115–119` retorna perfil não encontrado quando há bloqueio entre as contas.

**Resultado:** Depois do desbloqueio, os antigos vínculos não são restaurados automaticamente. As rotas/serviços de mensagens ainda não existem, portanto ocultar e restaurar conversas durante bloqueio não está implementado nem verificado.

### 04-003 — A resposta pública de perfil pessoal inclui localização, site e data de entrada além dos campos aprovados

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `profiles/application/profileViewMapper.ts:18–33` retorna `location`, `website` e `joinedAt`, além de `username`, `displayName`, `bio`, relacionamento e estatísticas. O mapeador também preenche URL de avatar e capa com `null`. A regra fornecida para perfil pessoal especifica nome de exibição, @, bio, seguidores, seguindo e Círculo; localização, site e data de entrada foram expressamente removidos do escopo público.

```ts
location: privateDetailsVisible ? row.locationLabel : null,
website: privateDetailsVisible ? row.websiteUrl : null,
joinedAt: row.createdAt.toISOString(),
```

**Limite:** Esta constatação é sobre o DTO do backend. O que o componente visual efetivamente mostra será verificado no bloco 10.

### 04-004 — Dados de idade não aparecem no DTO público de perfil

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `profileViewMapper.ts:18–33` lista os campos de saída e não contém idade. A busca estática por `accounts.age`/`age:` nos módulos backend e contratos encontrou usos no fluxo de cadastro e nenhum campo de idade em respostas de Profiles. Não foi feita uma chamada de perfil autenticada.

### 04-005 — O perfil comercial não expõe horário, serviços, comodidades nem link de mapa

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `profiles/application/commercialProfileDetails.ts:1–9` define o objeto público comercial com categoria, tipo de descoberta e endereço/CEP/cidade/estado/país. `profiles/application/publicProfile.ts:38–48` inclui esse objeto, publicações, artigos e mídia no perfil, mas não declara horários, serviços, comodidades, avaliação-resumo ou URL de mapa. Busca estática por esses campos nos módulos e schemas de Profiles encontrou somente referências de avaliação, sem modelos de horários/serviços/commodities.

**Impacto:** A leitura pública atual não consegue preencher os principais itens comerciais especificados. O endereço existe; a construção de um link externo para Google Maps não está definida neste contrato.

### 04-006 — O perfil público sempre retorna uma galeria de mídia vazia

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `profiles/application/publicProfile.ts:79–91` retorna `media: emptyPage`, com `emptyPage = { items: [], nextCursor: null }` declarado na linha 13. O mesmo DTO apresenta `avatarUrl` e `coverUrl` como `null` em `profileViewMapper.ts:23–24`.

```ts
posts: posts ?? emptyPage,
articles: articles ?? emptyPage,
media: emptyPage,
```

**Impacto:** Embora Media possua rotas próprias, a galeria não está ligada ao perfil público; fotos e vídeos não podem ser apresentados por essa resposta.

### 04-007 — Reviews têm regras centrais implementadas, mas a tabela necessária não existe no banco atual

**Veredito:** PARCIAL  
**Prioridade:** Crítica

**Evidência:** `businessProfileReviews.ts:246–294` permite avaliação somente por conta pessoal, valida nota de 1–5 e comentário de 10–500 caracteres, e trata duplicidade por índice único. `:297–331` permite exclusão pelo titular e resposta do perfil comercial. `shared/contracts/src/businessProfileReviews.ts:3–10` não possui campos para foto; a revisão lista média, total e distribuição em `businessProfileReviews.ts:22–26`. `businessProfileReviewRoutes.ts:143–185, 187–216, 218–278` registra criação, exclusão e resposta. O catálogo de desenvolvimento consultado no bloco 01 não contém `profiles.business_profile_reviews`, e a documentação já marca as quatro rotas como “banco pendente” (`docs/api/backend/endpoints.md:86–89`).

**Impacto:** A intenção e as regras de aplicação estão estruturadas, mas a API de reviews não pode ser considerada operacional sem a tabela ausente. Não foi chamada nenhuma dessas rotas. Fotos em avaliações não são aceitas pelo contrato atual; o skill de reviews registra comentários/fotos como regra vigente. Também não foi localizada rota de edição, consistente com a regra de apagar e republicar.

### 04-008 — Privacidade comercial não pode ser validada contra a remoção do Seek

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta

**Evidência:** `privacySettingsRepository.ts:43–64` salva `isPrivate` no perfil. `modules/index.ts:13–19` não monta um módulo Seek, e o catálogo do banco consultado no bloco 01 não contém tabelas de Seek.

**Impacto:** A API do perfil aceita torná-lo privado e bloqueia conteúdo conforme privacidade, mas não há fluxo de descoberta Seek no backend atual que prove que a listagem comercial desaparece quando a conta fica privada. Não é possível declarar essa regra concluída.

### 04-009 — Preferências de mensagens são gravadas por Profiles/Accounts sem módulo consumidor montado

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `profiles/application/privacySettings.ts:13–20` devolve preferências `messages` e `readReceipts`; `privacySettingsRepository.ts:56–64` grava esses campos na tabela `accounts`. O inventário de rotas do bloco 02 não encontrou roteador de mensagens.

**Impacto:** A interface pode oferecer controles sem uma implementação de Mensagens que os aplique. A propriedade desses dados também cruza a fronteira do futuro domínio de mensagens; a decisão de armazená-los em Accounts deve ser reconciliada no bloco 11, sem criar o módulo aqui.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 2 |
| CONTRADITO | 3 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** Banco de dados, migrations, constraints, índices, relações e diferenças entre schema local e banco de desenvolvimento.


---

# 05 — Banco de dados, migrations e integridade

## Método e limites

Inspecionei apenas arquivos de schema/migration e metadados do banco **de desenvolvimento**. As consultas foram executadas por `executeSql` no ambiente `development`; não houve leitura de linhas de negócio, contagem de registros, DDL, aplicação de migration, `push` ou teste de baseline.

### Consultas de catálogo executadas

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

**Saída resumida:** tabelas de aplicação listadas em `accounts`, `security`, `profiles`, `feed` e `media`, além das tabelas de histórico em `drizzle`. Não apareceu `profiles.business_profile_reviews`; tampouco apareceram tabelas de aplicação para `seek`, `messages`, `notifications`, `search`, `location`, `shop` ou `trust_safety`.

Também foram executadas consultas somente a `information_schema.columns`, `information_schema.table_constraints`, `pg_constraint` e `pg_indexes` para colunas, restrições e índices. A consulta de colunas não incluiu valores de contas. A consulta de restrições identificou FKs e checks; a de índices identificou unicidade e índices de consulta.

## Achados

### 05-001 — A separação lógica atual corresponde aos domínios construídos e à referência

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** a referência `attached_assets/SeekAlive_Arquitetura_Banco_Dados_por_Dominio_1793363320056.md:112–122` agrupa “Perfis e relações” e separa Contas de Segurança; `:213–223` permite uma infraestrutura PostgreSQL compartilhada durante o desenvolvimento. A tabela de catálogo confirmou esquemas de aplicação de Contas, Segurança, Perfis e Relações, Feed e Mídias. O esquema `seek` não tem tabela de aplicação no catálogo; isso é compatível com o escopo ainda não construído, não uma falha por si só.

**Conclusão:** há separação lógica; não há dez bancos físicos independentes. Isso corresponde à decisão registrada para o estágio de desenvolvimento.

### 05-002 — A migration de reviews existe, mas a tabela não está no banco de desenvolvimento

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `infra/database/src/schema/profiles/businessProfileReviews.ts` define a tabela e `infra/database/migrations/profiles/0003_misty_rhodey.sql` a cria. A consulta de catálogo acima não retornou `profiles.business_profile_reviews`. A documentação de API `docs/api/backend/endpoints.md:86–89` já identifica as rotas de reviews como dependentes do banco.

**Conclusão:** a estrutura está preparada em código/migration, mas a persistência não está presente no banco observado. Não determinei o estado do ledger de migrations, pois o prompt restringe a auditoria a metadados e não exige a leitura de conteúdo de ledger.

### 05-003 — As FKs entre domínios dependem da mesma instância PostgreSQL

**Veredito:** PARCIAL  
**Prioridade:** Alta, para futura separação física

**Evidência:** a consulta de constraints retornou FKs de `security`, `profiles`, `feed` e `media` para `accounts.accounts`, além de `media.assets.post_id` para `feed.posts`. A referência arquitetural `:207–211` registra que bancos físicos independentes não manterão essas FKs cruzadas e que a integridade deverá migrar para interfaces, validações e processos.

**Impacto:** adequado enquanto os domínios compartilham o banco de desenvolvimento, mas a exclusão em cascata e a integridade hoje garantidas pelo PostgreSQL não serão transportáveis diretamente para bancos físicos separados. Isso exige um fluxo coordenado por domínio antes da separação física; não foi implementado neste escopo.

### 05-004 — O teste de baseline não valida a cadeia completa das migrations ativas

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `infra/database/scripts/test-migration-baselines.mjs:128–140` lê apenas `0000_baseline.sql` de cada trilha; `:167–190` aplica especificamente as migrations Profiles `0001` e `0002` para a transferência histórica. O pacote oferece `test:baselines`, enquanto `migrationTrackConfig.ts:4–30` define as trilhas de geração/aplicação.

**Conclusão:** o teste protege uma transição histórica de baseline; não demonstra replay integral das migrations atuais, inclusive Profiles `0003` nem Feed `0003`. Não executei o teste conforme o escopo.

### 05-005 — Há migrations antigas na raiz sem trilha ativa apontada pela configuração atual

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `find infra/database/migrations -type f -name '*.sql'` listou arquivos `0000`–`0006` diretamente na raiz e trilhas separadas em subpastas. `migrationTrackConfig.ts:4–30` define somente `accounts`, `security`, `profiles`, `feed` e `media`, e grava migrations em `./migrations/${name}` (`:49–60`). Não localizei referência desses sete arquivos raiz na configuração de trilhas ou nos scripts atuais.

**Impacto:** o estado de legado/arquivo histórico não está explicitado por um manifesto encontrado. Não os removi: falta comprovação de que sejam descartáveis e o escopo proíbe limpeza fora do dossiê.

### 05-006 — Seek não tem trilha ativa, mas ainda aparece em configurações de schema e no teste de transferência

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `migrationTrackConfig.ts:4–30` não define trilha ativa para Seek. `infra/database/package.json:12–24` limita geração, verificação e migração aos cinco domínios ativos. `drizzle.push.config.ts:7–14` ainda inclui o glob `src/schema/seek/*.ts`, mas `find infra/database/src/schema -maxdepth 2 -type f -name '*.ts'` não encontrou arquivos de schema Seek. `test-migration-baselines.mjs:23–31,128–140` ainda lê o baseline histórico Seek para testar a transferência do perfil comercial.

**Conclusão:** a ausência de tabelas Seek é coerente com o módulo não construído e com Profiles como proprietário atual do perfil comercial. O glob vazio em `push` é uma diferença de configuração; seu efeito não foi testado, pois executar `push` está proibido.

### 05-007 — A constraint de idade adiciona limite superior não aprovado

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** a consulta de catálogo retornou `accounts_age_adult_range: CHECK (age >= 18 AND age <= 120)`. A consulta de colunas retornou `accounts.age` como `smallint NOT NULL`. A regra definida pelo usuário é idade mínima de 18 anos; não foi encontrada aprovação de idade máxima de 120.

**Conclusão:** o mínimo está protegido no banco; o limite máximo é uma validação adicional não documentada como decisão aprovada. O banco armazena idade calculada, não a data de nascimento.

### 05-008 — Constraints de exclusão validam consistência de estado, não a duração exata de 7 e 90 dias

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** a definição retornada para `accounts_deletion_schedule_consistent` exige datas presentes conforme o status, `deletion_scheduled_for > deletion_requested_at` e `deletion_retention_until > deletion_scheduled_for`. Ela não codifica, por si só, exatamente sete dias e noventa dias.

**Conclusão:** a constraint impede combinações temporais incoerentes, mas as durações exatas precisam ser asseguradas pela lógica de aplicação e pelos processos de expurgo; a auditoria específica desses fluxos fica no bloco 13.

### 05-009 — Restrições e índices protegem invariantes centrais do cadastro, relações, feed e mídia

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** as consultas de catálogo confirmaram:

- unicidade do e-mail normalizado e do nome de usuário ativo;
- PKs/uniqueness para pares de seguir, solicitação, bloqueio, curtida, bookmark e repost;
- proibição de auto-seguimento, auto-bloqueio e autoavaliação;
- checks de audiência/formato/conteúdo em publicações e range de nota 1–5 na migration de reviews;
- allowlist de MIME e tamanho de mídia entre 1 byte e 100 MiB, além de estados staged/attached coerentes;
- índices de expiração de sessões, desafios de autenticação e mídias staged.

**Limite:** isto confirma a presença estrutural dos objetos no catálogo; não comprova comportamento concorrente nem cobertura de testes.

### 05-010 — Tabelas de domínios futuros não foram confundidas com erros da implementação atual

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** a lista de tabelas do banco não mostrou tabelas de aplicação para Mensagens, Notificações, Pesquisa, Localização, Seek, Shop ou Confiança e Segurança. A arquitetura de referência enumera esses domínios como parte da evolução (`:31–40, 100–175`) e declara que a lista é planejada, não comprovação de implementação (`:263–280`).

**Conclusão:** esses domínios permanecem trabalho futuro. A ausência atual não foi contabilizada como defeito do que está efetivamente construído.

### 05-011 — Privilégios efetivos do usuário de runtime do backend não estão confirmados

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta

**Evidência:** consulta de catálogo para `current_user` da ferramenta retornou `rolsuper = true`, `rolcreatedb = true`, `rolcreaterole = true` e permissão `CREATE` nos cinco schemas de aplicação. Uma consulta de ownership também mostrou o papel da ferramenta como owner de todas as tabelas listadas. Não foi comprovado que esse papel seja idêntico ao usuário de conexão do processo da API; nenhum nome de papel, URL ou valor de conexão foi impresso/lido.

**Impacto:** a ferramenta de consulta tem privilégios amplos no banco de desenvolvimento. Isso não prova que a API os tenha; é necessário identificar com segurança o papel efetivo do processo antes de concluir se o runtime segue menor privilégio ou pode executar DDL.

### 05-012 — Versão, extensão e triggers do PostgreSQL foram consultados no ambiente de desenvolvimento

**Afirmação da doc:** N/A — verificação de metadados solicitada pelo prompt.

**Veredito:** CONFIRMADO
**Risco:** Informativo — confirmação restrita ao banco de desenvolvimento observado, não a outro ambiente.

**Evidência:** consultas de metadados em `environment: development` retornaram `server_version = 16.10`, extensão `plpgsql 1.0` e zero triggers não internos habilitados ou desabilitados nos schemas não sistêmicos. A consulta de `pg_class` contou tabelas de aplicação por schema, sem ler linhas de negócio.

**Saída resumida:** `accounts: 4`, `feed: 8`, `media: 1`, `profiles: 5`, `security: 4`, `drizzle: 6` tabelas. As contagens são de objetos de catálogo, não de registros de usuários.

### 05-013 — As FKs para `accounts.accounts` não impedem exclusão por `RESTRICT` ou `NO ACTION`

**Afirmação da doc:** A linha de conta será removida fisicamente após a janela de 7 + 90 dias.

**Veredito:** CONFIRMADO para a ação das FKs catalogadas; execução da exclusão permanece sujeita ao achado 13-006.
**Risco:** Médio — a ausência de bloqueio por FK não comprova que o processo de expurgo conclua a remoção.

**Evidência:** consulta somente a `pg_constraint`, com `contype = 'f'` e tabela referenciada `accounts.accounts`, listou 22 FKs: 21 `CASCADE` e uma `SET NULL` (`accounts.account_username_reservations`). Nenhuma retornou `RESTRICT` ou `NO ACTION`.

**Limite:** a consulta cobre apenas FKs direcionadas a `accounts.accounts`; não testa a operação de exclusão nem outras restrições/efeitos em cascata.

### 05-014 — A coluna legada `accounts.is_verified` ainda existe, sem leitura ou escrita encontrada no código

**Afirmação da doc:** Verificar se `accounts.is_verified` (legada) continua em uso.

**Veredito:** PARCIAL
**Risco:** Baixo — coluna residual pode divergir do estado de verificação mantido no domínio de e-mail.

**Evidência:** o catálogo retornou `accounts.is_verified boolean NOT NULL DEFAULT false`; busca `rg -n 'is_verified|isVerified'` em backend, frontend, schema e contratos encontrou somente `infra/database/src/schema/accounts/schema.ts:43`.

**Limite:** a busca abrangeu os caminhos indicados, não consumidores SQL fora do workspace ou ferramentas externas.

### 05-015 — Há ledgers de migration por domínio, mas o conteúdo das trilhas aplicadas não foi lido

**Afirmação da doc:** Metadados de migrations devem ser conferidos sem ler dados de usuários.

**Veredito:** PARCIAL
**Risco:** Médio — a presença de ledger não comprova quais migrations foram aplicadas nem se cada trilha está sincronizada com o schema.

**Evidência:** consulta a `information_schema.columns` identificou os ledgers `accounts_migrations`, `feed_migrations`, `media_migrations`, `profiles_migrations`, `security_migrations` e `seek_migrations`, cada um com `id`, `hash` e `created_at`. Nenhuma linha dos ledgers foi consultada.

### 05-016 — Drift completo entre o catálogo e os schemas Drizzle não foi calculado

**Afirmação da doc:** N/A — lacuna do escopo de comparação solicitado.

**Veredito:** NÃO VERIFICADO
**Risco:** Médio — uma diferença não detectada de coluna, índice ou constraint pode causar comportamento diferente entre o banco e a próxima migration.

**Evidência:** foram consultados metadados de colunas, constraints e índices, mas não foi executada comparação automatizada objeto a objeto entre o catálogo e todos os schemas/migrations Drizzle. A execução de geração, migration e `push` foi proibida pelo prompt.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 9 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 2 |

**Próximo bloco:** Feed, publicações, visibilidade, comentários, interações, tags e paginação.


---

# 06 — Feed, publicações, visibilidade, interações e tags

## Escopo

Confronto do backend Feed e dos contratos usados pelo cliente: páginas “Para você”, “Seguindo”, “Artigos” e “Vídeos”; visibilidade por público; criação/remoção; cursor; busca e hashtags. Nenhum conteúdo de conta foi consultado.

## Achados

### 06-001 — As quatro abas têm filtros explícitos no endpoint

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `feed/presentation/globalFeedRoutes.ts:8–23,31–91` aceita `for-you`, `following`, `articles` e `videos`, limita a página a 50 itens e exige autenticação para `following`. `feed/application/listGlobalFeed.ts:39–48,72–79` restringe seguindo aos IDs acompanhados, artigos ao formato `article` e vídeos a mídia com vídeo. O cliente envia os mesmos valores (`front/src/modules/social/services/restContracts.ts:72–94`).

**Trecho:** `feedTabs = new Set(["for-you", "following", "articles", "videos"])`; para vídeos, `videoOnly: input.tab === "videos"`.

### 06-002 — “Para você” é cronológico global, não um feed personalizado

**Veredito:** CONFIRMADO  
**Prioridade:** Alta antes de declarar o algoritmo concluído

**Evidência:** em `listGlobalFeed.ts:39–48`, a lista de contas seguidas só é buscada para a aba `following`; para `for-you` o filtro de autores permanece nulo. `feed/infrastructure/postRepository.ts:183–186` ordena por `created_at DESC, id DESC`.

**Trecho:** `const followingIds = input.tab === "following" ? await listFollowingIds(...) : null;` e `.orderBy(desc(feedPosts.createdAt), desc(feedPosts.id))`.

**Conclusão:** existe um feed público cronológico com filtros de acesso. Não há geração de candidatos, score, sinais de interesse ou ranking de recomendação. Isso é compatível com uma implementação em etapas, mas não entrega um algoritmo “Para você”.

### 06-003 — Restrições de privado, Círculo e bloqueio são aplicadas antes da resposta

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `feed/application/listGlobalFeed.ts:86–113` carrega autores e chama `canReadPost` antes de adicionar conteúdo. `feed/application/postVisibility.ts:14–37` nega autores bloqueados; exige seguimento aceito para perfis privados e exige `inCircle` para publicações do Círculo.

**Trecho:** `if (isInFollowingFeed && canReadPost(post, input.viewerId, author)) { items.push({ record: post, author }); }`.

### 06-004 — A paginação usa ordenação composta e cursor vinculado à aba e ao usuário

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `feed/infrastructure/postRepository.ts:172–186` aplica keyset por `(createdAt,id)` e ordena pelas mesmas colunas. `feed/application/globalFeedCursor.ts:10–24,27–59` serializa cursor com versão, aba, viewer, busca, data e ID; a leitura valida escopo e formato.

**Trecho:** cursor contém `{ version, tab, viewerId, searchTerm, createdAt, id }`; o parser rejeita cursor com aba ou viewer divergente.

**Limite:** o cursor é Base64URL, não assinado. A validação de escopo existe, e a visibilidade permanece no servidor; não foi demonstrado teste de tentativas de cursor adulterado nem de inserções concorrentes entre páginas.

### 06-005 — O limite de dez hashtags distintas e normalização sem acentos/caixa estão implementados

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `shared/contracts/src/feed/hashtags.ts:1–16` define o máximo de dez, remove diacríticos e normaliza para minúsculas. `:19–42` deduplica por valor normalizado. `feed/domain/postTags.ts:15–22` rejeita publicações acima do limite; `createPost.ts:13–21` chama a validação antes de persistir. `postRepository.ts:152–168` aplica busca por prefixo no índice de tags.

**Trecho:** `MAX_HASHTAGS_PER_POST = 10`; `value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")`.

**Exemplo:** hashtags equivalentes a `#café` e `#cafe` contam como uma tag distinta; uma busca por prefixo normalizado `cafe` pode incluir `cafeteira`. A busca por texto livre usa `lower()` e não a mesma remoção de acentos.

### 06-006 — Busca textual usa substring sem índice de texto correspondente identificado

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `feed/infrastructure/postRepository.ts:152–168` usa `position(lower(term) in lower(content/title/body))`; os índices catalogados no bloco 05 incluem índice de prefixo para tags, mas não índice de texto para conteúdo, título ou corpo. `EXPLAIN (COSTS TRUE, FORMAT TEXT)` de uma forma representativa da busca textual retornou `Seq Scan on posts`, seguido de `Sort`; não foi usado `ANALYZE`.

**Trecho:** `position(lower(${input.searchTerm}) in lower(${feedPosts.content})) > 0`.

**Consulta e saída resumida:** `EXPLAIN (COSTS TRUE, FORMAT TEXT) SELECT id, author_id, created_at FROM feed.posts WHERE position(lower($1::text) in lower(content)) > 0 ORDER BY created_at DESC, id DESC LIMIT 51`, parâmetro fictício `cafe`: `Seq Scan on posts` com filtro `POSITION(...) > 0`; depois `Sort` por `created_at DESC, id DESC`. O plano estimou 23 linhas; isso é estimativa do planner, não contagem de registros.

**Impacto:** a forma representativa da busca textual exige varredura de posts e ordenação. Os filtros completos de visibilidade, formato, tags e cursor podem alterar o plano; o custo com volume futuro não é inferido deste catálogo pequeno.

### 06-007 — Publicações e artigos têm limites e formatos verificados também no banco

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `front/src/modules/social/application/contentValidation.ts:13–25,39–57` valida texto até 280, título até 160, artigo até 50.000 e até oito mídias. `feed/infrastructure/postRepository.ts:50–69` persiste publicação, tags e referência na mesma transação. O catálogo do bloco 05 mostrou checks de formato, audiência e conteúdo em `feed.posts`.

**Trecho:** `content: z.string().max(280)`; `title: ...max(160)`; `body: ...max(50000)`; `mediaUrls: ...max(8)`.

### 06-008 — Repost é persistido como interação e contagem, mas não como item próprio do feed

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** o roteador liga `createPostRepostRoutes` e `setFeedPostRepost` (`feed/composition/router.ts:94–95, 119–133`). Porém, `listFeedPostsForTimeline` (`postRepository.ts:132–186`) seleciona linhas de `feed.posts` e não une eventos de `feed.post_reposts`; o resultado não carrega autor/data da republicação como item de timeline.

**Trecho:** `listFeedPostsForTimeline` executa `.select().from(feedPosts)`; não há seleção de `feedPostReposts` nesse leitor.

**Impacto:** curtir/repostar e mostrar a contagem têm suporte; exibir uma republicação como conteúdo redistribuído no feed não foi demonstrado.

### 06-009 — O feed não tem estado de moderação explícito para ocultar publicações

**Veredito:** PARCIAL  
**Prioridade:** Alta antes de abrir a plataforma ao público

**Evidência:** a estrutura de publicação contém formato, audiência e conteúdo, sem coluna de status de moderação (`infra/database/src/schema/feed/posts.ts` e catálogo de colunas do bloco 05). O leitor filtra visibilidade por audiência, autor e bloqueio (`postVisibility.ts:14–37`), mas não por estado de denúncia/revisão.

**Trecho (catálogo do bloco 05):** as colunas de `feed.posts` não incluem estado de moderação; a consulta de `information_schema.columns` foi somente metadado.

**Limite:** Trust & Safety é um domínio ainda não construído. Não trato essa ausência como falha de uma funcionalidade que o projeto declarou adiar; ela impede, contudo, declarar o fluxo público de moderação concluído.

### 06-010 — O índice de autor e o índice de prefixo de hashtag aparecem nos planos representativos

**Afirmação da doc:** N/A — execução segura de `EXPLAIN` sem `ANALYZE`, usando parâmetros fictícios.

**Veredito:** CONFIRMADO
**Risco:** Informativo — o planner usa índices em formas simplificadas, mas os planos ainda incluem ordenação.

**Evidência:** `postRepository.ts:172–186` pagina por autor/data/ID e `:160–165` usa prefixo normalizado de tag. Consultas `EXPLAIN (COSTS TRUE, FORMAT TEXT)` usaram identificadores fictícios e não leram linhas da tabela.

**Consultas e saída resumida:**

- Timeline por `author_id = ANY($1::uuid[])`, cursor de primeiro lote e `LIMIT 51`: `Index Only Scan using feed_posts_author_created_id`, seguido de `Sort` por `created_at DESC, id DESC`.
- `EXISTS` sobre `feed.post_tags` com `normalized_tag LIKE $1::varchar`, parâmetro `cafe%`: `Bitmap Index Scan using feed_post_tags_normalized_prefix_idx`, `Bitmap Heap Scan`, lookup por `posts_pkey` e `Sort`.

**Limite:** são formas representativas e os custos/linhas são estimativas. Não equivalem à consulta completa do caso de uso com todos os predicados e relações de visibilidade.

### 06-011 — Os demais planos de consultas principais não foram cobertos por EXPLAIN

**Afirmação da doc:** O plano deve ser confrontado para feed global/seguindo, busca, timeline, relações e avaliações.

**Veredito:** NÃO VERIFICADO
**Risco:** Médio — a evidência de indexação é parcial e não cobre o conjunto de formas reais de consulta.

**Evidência:** foram executados apenas planos representativos da busca textual, timeline por autor e prefixo de hashtag. Não foi gerado plano para o feed completo com visibilidade, seguidores/seguindo, listagens de relações ou avaliações. O bloco 05 documenta que `profiles.business_profile_reviews` não existe no catálogo atual.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 7 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** transações e concorrência entre operações que escrevem em mais de um registro.


---

# 07 — Transações e concorrência

## Escopo e limites

Revisão estática dos fluxos críticos: cadastro, relações, sessões, publicação com mídia, avaliação e exclusão/restauração. Não foram iniciadas escritas, migrations ou testes paralelos. O nível de isolamento efetivo do servidor PostgreSQL não foi consultado.

## Achados

### 07-001 — Cadastro depende de uma transação única que cruza Accounts, Auth e Profiles

**Afirmação da doc:** A arquitetura lógica declara domínios separados; nenhum documento autoriza uma transação distribuída entre bancos físicos nesta etapa.  
**Veredito:** PARCIAL  
**Risco:** Alto antes de separar fisicamente os bancos — o fluxo atual depende de compartilhar uma transação PostgreSQL.

**Evidência:** `auth/infrastructure/registrationAccountCoordinator.ts:37–80` cria identidade, credencial e inicializa Profiles dentro de `runInTransaction`, passando a mesma transação a cada operação. O bloco 05 confirmou FKs entre os schemas lógicos na mesma instância; o bloco 03 descreve as dependências.

**Trecho:** `createPendingAccountIdentity(transaction, ...)`, `createInitialPasswordCredential(transaction, ...)` e `initializeAccountProfile(transaction, ...)` são executados no mesmo callback transacional.

### 07-002 — Follow e block serializam contas em ordem canônica de UUID

**Afirmação da doc:** N/A — verificação do protocolo de lock das relações.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a ordenação comum reduz deadlocks entre operações que travam o mesmo par.

**Evidência:** `social/infrastructure/relationshipTransactionSupport.ts:18–43` remove duplicatas, ordena os IDs e adquire `FOR UPDATE` por conta. `followMutationRepository.ts:14–16` e `blockMutationRepository.ts:9–13` executam essa aquisição dentro de `db.transaction`.

**Trecho:** `for (const id of [...new Set([firstId, secondId])].sort()) ... .for("update")`.

### 07-003 — O limite de sessões usa lock por conta e revoga as mais antigas na transação

**Afirmação da doc:** N/A — verificação de concorrência de sessões.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a transação serializa a escolha das sessões antigas, mas a corrida não foi reproduzida.

**Evidência:** `auth/infrastructure/sessionCreationRepository.ts:21–61` bloqueia a linha da conta, consulta sessões ativas ordenadas por `createdAt` e `id`, calcula as que excedem o limite e as revoga antes da inserção. O bloco 03 confirma que a regra de produto é no máximo duas sessões simultâneas.

**Trecho:** `.for("update")` na conta e nas sessões ativas, seguido de `selectOldestSessionIdsToRevoke`.

### 07-004 — Publicação e associação dos ativos staged são transacionais no banco, mas o arquivo existe antes da transação

**Afirmação da doc:** N/A — verificação do fluxo de mídia/publicação.  
**Veredito:** PARCIAL  
**Risco:** Médio — uma falha após upload e antes do vínculo pode deixar mídia staged até a limpeza de expiração.

**Evidência:** `feed/composition/postPersistence.ts:23–74` cria publicação, tags e associa ativos dentro de `db.transaction`. O upload grava o arquivo e o ativo staged antes da publicação (`media/application/uploadMedia.ts`; ver bloco 08). Não há transação única entre filesystem e banco; o bloco 08 documenta limpeza oportunística de uploads expirados.

**Trecho:** a persistência da publicação recebe os IDs staged e executa criação/associação no callback transacional.

### 07-005 — A escrita de avaliações não abre uma transação própria e a tabela falta no banco de desenvolvimento

**Afirmação da doc:** `docs/api/backend/endpoints.md:86–89` marca a API de avaliações como implementada em código e banco pendente.  
**Veredito:** PARCIAL  
**Risco:** Alto para a funcionalidade — os handlers não podem completar gravação/leitura se a tabela ausente continuar ausente.

**Evidência:** `profiles/infrastructure/businessProfileReviewRepository.ts:168–180` executa `db.insert(businessProfileReviews)` diretamente, sem `db.transaction` ao redor dessa escrita. O bloco 05 verificou no catálogo de desenvolvimento que `profiles.business_profile_reviews` não existe. A constraint única declarada no schema não substitui a validação operacional da tabela.

**Trecho:** `const [row] = await db.insert(businessProfileReviews).values(...).returning();`.

### 07-006 — Os fluxos críticos não declaram isolamento nem retry explícito para erros de serialização/deadlock

**Afirmação da doc:** N/A — verificação de isolamento e tratamento de erros de concorrência.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — não há evidência suficiente para afirmar o nível efetivo ou comportamento de retry do ambiente de desenvolvimento.

**Evidência:** busca estática `rg -n 'isolationLevel|SERIALIZABLE|40001|40P01|serialization_failure|deadlock' Aplicativo/back/src infra/database/src --glob '*.ts'` retornou `No matches`. O código chama `db.transaction`, sem parâmetro de isolamento localizado. Não foi consultado `SHOW default_transaction_isolation` nem executada corrida.

**Trecho da saída:** `No matches`.

### 07-007 — A cobertura localizada não demonstra concorrência real dos fluxos com lock

**Afirmação da doc:** N/A — limite das evidências de teste.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — o raciocínio baseado em locks não substitui testes concorrentes no banco.

**Evidência:** existem testes de política e injeção para Social, Feed, Auth e exclusão, mas o inventário não demonstra teste concorrente de cadastro, follow/accept, limite de sessões, confirmações OTP ou criação de avaliação. O prompt proíbe executar testes nesta auditoria; ver bloco 14.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 2 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 2 |


---

# 08 — Mídia, upload e armazenamento

## Escopo e método

Verificação do caminho de fotos e vídeos entre navegador, API, filesystem local, registro de ativo, publicação e remoção. Nenhum arquivo foi enviado, lido da pasta de armazenamento ou removido. As afirmações sobre autorização/headers derivam da leitura de código, não de requisições de mídia.

## Achados

### 08-001 — O armazenamento local está restrito ao desenvolvimento

**Afirmação da doc:** O armazenamento local é temporário e exclusivo para desenvolvimento.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — não deve ser apresentado como armazenamento de produção.

**Evidência:** `media/infrastructure/localMediaFileStore.ts:35–39,60–63` configura o caminho `generated-artifacts/social-media` e rejeita upload quando `NODE_ENV` não é `development`. `media/presentation/mediaRoutes.ts:140–145` transforma isso em 503.

**Trecho:** `if (process.env.NODE_ENV !== "development") throw new Error("Local media uploads are enabled only in development.");`.

### 08-002 — Upload usa UUID, streaming com limite de bytes e assinatura inicial

**Afirmação da doc:** N/A — inventário de controles implementados.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — os limites reduzem o tamanho aceito, mas não validam integralmente o conteúdo.

**Evidência:** `media/domain/mediaAsset.ts:4–9` define oito anexos, 10 MiB por imagem, 100 MiB por vídeo e validade staged de 24 h. `mediaRoutes.ts:97–119` valida tipo e `Content-Length` quando presente. `localMediaFileStore.ts:65–107` gera UUID, conta bytes do stream, valida assinatura e cria arquivo com `0600`; a chave UUID é validada antes de formar o caminho (`:18–19,41–46`), e o diretório é criado com `0700` (`:74`).

**Trecho:** o contador `sizeBytes` interrompe quando ultrapassa `maximumBytes`; o arquivo é criado com `flags: "wx", mode: 0o600`.

### 08-003 — Magic bytes não comprovam decodificação, integridade completa ou segurança do arquivo

**Afirmação da doc:** N/A — análise adversarial da validação.  
**Veredito:** PARCIAL  
**Risco:** Alto antes de expor uploads publicamente — arquivos malformados podem passar na assinatura inicial.

**Evidência:** `media/domain/mediaAsset.ts:82–130` reconhece assinatura inicial e `localMediaFileStore.ts:99–107` grava após essa verificação. Não foi encontrado parser/decodificador completo, validação de dimensão/duração, transcodificação, remoção EXIF ou análise de conteúdo.

**Trecho:** `const detected = detectMediaSignature(header); if (!detected) throw new UnsupportedMediaSignatureError();`.

### 08-004 — A sessão Social autenticada envia mídia ao backend; preview usa URL temporária

**Afirmação da doc:** N/A — verificação estática da integração frontend/backend.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — nenhuma transferência real foi testada durante esta auditoria.

**Evidência:** `front/src/modules/social/application/postActions.ts:78–87` escolhe REST fora do preview. `social/services/restContentService.ts:20–50` envia arquivos e cria post com IDs staged. `restMediaApi.ts:15–31` envia `POST /api/v1/social/media` como octet-stream; o backend recebe stream em `back/src/modules/media/presentation/mediaRoutes.ts:86–149`. A prévia do navegador usa `blob:` (`mediaService.ts:71–86`); o modo preview só inicia em desenvolvimento (`app/state/AppContext.tsx:112–120`).

**Trecho:** o payload da publicação inclui `mediaAssetIds: uploadedMedia.map((media) => media.id)`.

### 08-005 — A anexação de ativos staged ao post valida titularidade e usa uma transação de banco

**Afirmação da doc:** N/A — verificação do vínculo entre mídia e publicação.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — arquivo físico e transação de banco continuam sendo recursos distintos.

**Evidência:** `media/infrastructure/mediaAssetRepository.ts:58–76` exige proprietário, estado staged, não expirado e bloqueia a linha. `feed/composition/postPersistence.ts:23–74` valida IDs, cria post/tags e anexa os ativos na mesma transação. A leitura de ativo staged confere o proprietário (`mediaRoutes.ts:168–180`).

**Trecho:** a consulta exige `ownerAccountId`, `state = "staged"` e `expiresAt > now`, usando `.for("update")`.

### 08-006 — Exclusão de post pode deixar arquivo órfão sem retry durável

**Afirmação da doc:** N/A — análise da remoção e recuperação após falha.  
**Veredito:** PARCIAL  
**Risco:** Médio — uma falha transitória do filesystem pode deixar conteúdo ocupando disco sem referência recuperável.

**Evidência:** `feed/composition/postPersistence.ts:81–100` remove os registros em transação e retorna chaves; `:102–112` tenta apagar arquivos depois e apenas registra evento em caso de falha. O ativo associado já foi removido por cascade, conforme o schema do bloco 05.

**Trecho:** o `catch` registra `media.deleted_post_file_cleanup_failed` e continua sem retry durável.

### 08-007 — A limpeza de uploads abandonados depende de novos uploads

**Afirmação da doc:** A expiração de 24 horas elimina ativos staged.  
**Veredito:** PARCIAL  
**Risco:** Médio — o arquivo pode permanecer no disco após expirar até outro upload acionar a limpeza.

**Evidência:** `media/application/uploadMedia.ts:31–43` aciona limpeza no começo do upload; `mediaAssetRepository.ts:133–155` limita a consulta a 100 registros. Não foi encontrado worker/agenda de limpeza dedicado no módulo.

**Trecho:** a limpeza está dentro de `uploadMedia`; consulta `.limit(100)`.

### 08-008 — A leitura de mídia anexada reutiliza a autorização do post e envia `private, no-store`

**Afirmação da doc:** N/A — verificação de cache compartilhado e leitura privada.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — nenhum cache compartilhado externo foi testado, mas a resposta de origem não deve ser armazenada.

**Evidência:** `media/presentation/mediaRoutes.ts:172–180` chama `readPost(postId, accountId)` e verifica que a URL pertence ao post. `:203–218` envia `Content-Type` detectado, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Cache-Control: private, no-store`, suporte a Range e stream. Busca estática do mesmo arquivo não encontrou `Vary`.

**Trecho:** `canRead = Boolean(post && post.mediaUrls?.includes(...))`; a origem não define `Vary`. O `private, no-store` reduz o risco de cache compartilhado conforme o comportamento esperado dos caches conformes, mas nenhum cache externo foi testado.

### 08-009 — Concorrência de streams, limite de disco e reconciliação de órfãos não foram demonstrados

**Afirmação da doc:** N/A — validação operacional proibida nesta auditoria.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — limites por arquivo não comprovam o uso total de disco ou comportamento sob carga.

**Evidência:** não foram executados testes de carga/concorrência, disco cheio ou reconciliação do filesystem. O código limita bytes por arquivo e define rate limit, mas o consumo máximo do host de desenvolvimento não foi medido.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |


---

# 09 — E-mail e processamento assíncrono

## Escopo e método

Auditoria estática do caminho de envio de códigos/avisos e workers existentes. Segredos não foram lidos; não foi feita chamada HTTP ao Resend, envio de mensagem, nem execução de job.

## Achados

### 09-001 — O backend chama diretamente a API oficial do Resend

**Afirmação da doc:** N/A — verificação do provedor efetivamente usado no código.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a credencial é usada server-side; nenhum valor foi consultado ou registrado.

**Evidência:** `auth/infrastructure/emailDelivery.ts:36–41` lê apenas os nomes `RESEND_API_KEY`, `RESEND_ENABLED`, `RESEND_FROM_EMAIL`; `:62–76` envia `POST https://api.resend.com/emails` com bearer auth. Não foi encontrada chamada ao serviço de e-mail da Replit nesse transporte.

**Trecho:** `fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: \`Bearer ${resendApiKey}\` ... } })`.

### 09-002 — A entrega está fechada fora do ambiente de desenvolvimento

**Afirmação da doc:** A integração deve permanecer preparada, sem ativar envio real fora do desenvolvimento.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — configuração efetiva do processo não foi inspecionada.

**Evidência:** `emailDelivery.ts:37–41,58–60,87–92` exige `NODE_ENV=development`, `RESEND_ENABLED=true`, chave e remetente. Sem uma condição satisfeita, falha fechado.

**Trecho:** `if (!isDevelopment || !resendEnabled || !resendApiKey || !resendFrom) throw new EmailDeliveryUnavailableError();`.

### 09-003 — A chamada ao provedor tem timeout e não inclui o corpo da falha na resposta da aplicação

**Afirmação da doc:** N/A — verificação de timeout e exposição de erro.  
**Veredito:** CONFIRMADO  
**Risco:** Baixo — a operação síncrona pode falhar por indisponibilidade, mas tem limite de espera.

**Evidência:** `emailDelivery.ts:75–84` usa timeout de dez segundos e converte respostas não-2xx em erro que contém o status HTTP, não o corpo do provedor.

**Trecho:** `signal: AbortSignal.timeout(10_000)`; a falha gera `Resend email request failed with status ${response.status}.`.

### 09-004 — O envio não tem fila, outbox nem retry automático

**Afirmação da doc:** N/A — avaliação de entrega eventual.  
**Veredito:** PARCIAL  
**Risco:** Médio — queda do processo ou falha do provedor depende de nova solicitação e do fluxo chamador.

**Evidência:** `emailDelivery.ts:52–85` aguarda `fetch` diretamente. A busca estática por outbox/fila no domínio Auth não encontrou worker que persista e reenvie mensagens.

**Trecho:** `await fetch(...)`; o método retorna ou lança após a resposta sem publicar evento durável.

### 09-005 — Um adaptador atende códigos de cadastro, sessão e alterações de conta

**Afirmação da doc:** N/A — inventário dos usos do e-mail transacional.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — alterações no adaptador afetam múltiplos fluxos de Auth.

**Evidência:** `emailDelivery.ts:89–179` define métodos para verificação, reset/alteração de senha, dispositivo novo, troca de e-mail e exclusão/restauração. `auth/composition/*` os injeta nos fluxos. O adaptador falso é habilitado somente com `NODE_ENV=test` (`:19–34`).

### 09-006 — Valores interpolados nos templates HTML são escapados

**Afirmação da doc:** N/A — verificação de injeção HTML nos templates de e-mail.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — reduz XSS/injeção no corpo de HTML para os campos tratados.

**Evidência:** `emailDelivery.ts:43–50,92–99,109–116,154–162` escapa caracteres HTML e aplica o escape aos nomes e valores mascarados antes de interpolá-los.

**Trecho:** codifica `&`, `<`, `>`, `"`, `'` para entidades HTML.

### 09-007 — Envio real e configuração ativa não foram verificados

**Afirmação da doc:** N/A — limite de leitura-only do prompt.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — a implementação no código não prova que o provedor ou remetente esteja operacional.

**Evidência:** nenhuma chamada HTTP ao Resend ou mensagem foi feita; nenhum valor de variável de ambiente foi lido. O prompt proíbe acesso a segredos e efeitos externos.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 1 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |


---

# 10 — Configuração, observabilidade e operação

## Escopo e método

Inventário estático das variáveis de ambiente pelo nome, validação de configuração, ciclo de vida do processo, logs e readiness. Nenhum valor de ambiente, segredo, log de execução ou configuração de produção foi lido. Não foram iniciados, reiniciados ou interrompidos processos.

## Achados

### 10-001 — A porta é obrigatória, mas a validação não verifica todo o intervalo de portas

**Afirmação da doc:** N/A — verificação de configuração de inicialização.  
**Veredito:** PARCIAL  
**Risco:** Baixo no desenvolvimento — valor fora do intervalo suportado pode falhar somente ao abrir o servidor.

**Evidência:** `Aplicativo/back/src/index.ts:6–18` exige `PORT`, converte para número e rejeita `NaN`/valores não positivos; não valida inteiro nem limite superior antes de `app.listen`.

**Trecho:** `if (Number.isNaN(port) || port <= 0) throw new Error(...)`.

### 10-002 — Segredo e duração de sessão têm validação fail-fast

**Afirmação da doc:** N/A — avaliação de configuração sensível.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — configuração ausente ou fraca interrompe o carregamento do módulo em vez de reduzir silenciosamente a segurança.

**Evidência:** `security/sessionConfig.ts:6–16` exige `SESSION_SECRET` com ao menos 32 bytes e limita `SESSION_TTL_SECONDS` a inteiro entre 60 segundos e 30 dias; o padrão configurado é sete dias.

**Trecho:** configuração inválida lança erro durante a inicialização do módulo.

### 10-003 — Variáveis de ambiente não passam por um validador central único

**Afirmação da doc:** N/A — inventário de configuração distribuída.  
**Veredito:** PARCIAL  
**Risco:** Médio — defaults e verificações podem variar por consumidor; a lista abaixo é o que o código pesquisado referencia, não um contrato de implantação completo.

**Evidência:** inventário estático com `rg -o --hidden --no-filename 'process\\.env\\....|import\\.meta\\.env\\....'` em fontes e ferramentas, sem valores: `APP_ORIGIN`, `AUDIT_SCOPE`, `BASE_PATH`, `DATABASE_URL`, `LOG_LEVEL`, `NODE_ENV`, `PORT`, `REPL_ID`, `REPLIT_DEPLOYMENT`, `REPLIT_DEV_DOMAIN`, `RESEND_API_KEY`, `RESEND_ENABLED`, `RESEND_FROM_EMAIL`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS`, `SEEKALIVE_CHROMIUM_EXECUTABLE_PATH`, `SEEKALIVE_DATABASE_TARGET`, `SEEKALIVE_DB_MIGRATION_TARGET`, `SEEKALIVE_DB_MIGRATION_TRACK`, `SEEKALIVE_DB_SCHEMA`, `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_WEB_URL`, `SESSION_SECRET`, `SESSION_TTL_SECONDS`, `import.meta.env.BASE_URL` e `import.meta.env.DEV`. `connection.ts:26–34` também lê os nomes `SEEKALIVE_EXTERNAL_DATABASE_URL` e `DATABASE_URL` do objeto de ambiente recebido.

**Defaults e validações identificados no código:**

| Variáveis | Comportamento estático constatado |
|---|---|
| `PORT` | obrigatória; conversão numérica e validação de valor positivo. Inteiro e teto de porta não são verificados antes de `listen` (`back/src/index.ts:6–18`). |
| `SESSION_SECRET`, `SESSION_TTL_SECONDS` | segredo mínimo de 32 bytes; TTL padrão de sete dias, inteiro entre 60 segundos e 30 dias (`security/sessionConfig.ts:6–16`). |
| `LOG_LEVEL` | padrão `info`; não foi localizada validação de allowlist (`common/logger.ts:5–19`). |
| `NODE_ENV` | condiciona logs, envio de e-mail e armazenamento local de mídia; o comportamento depende de comparações locais, sem parser central (`emailDelivery.ts:24,36–38`; `localMediaFileStore.ts:61`). |
| `RESEND_API_KEY`, `RESEND_ENABLED`, `RESEND_FROM_EMAIL` | chave opcional, envio habilitado somente quando a flag é exatamente `true`, remetente pode usar fallback no código (`emailDelivery.ts:36–40`). Valores efetivos não foram consultados. |
| `DATABASE_URL`, `SEEKALIVE_EXTERNAL_DATABASE_URL`, `SEEKALIVE_DATABASE_TARGET`, `SEEKALIVE_DB_MIGRATION_TARGET` | resolver seleciona o alvo de runtime e migração; runtime pode assumir alvo Replit, enquanto migração exige escolha explícita (`infra/database/src/connection.ts:10–35`). URLs não foram lidas. |
| `SEEKALIVE_DB_SCHEMA`, `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS`, `REPLIT_DEPLOYMENT` | guardas de schema isolado e testes, não configuração de tráfego da aplicação (`infra/database/schema/config.ts:3–10`; scripts do banco). |
| `BASE_PATH`, `REPL_ID`, `REPLIT_DEV_DOMAIN`, `SEEKALIVE_WEB_URL`, `SEEKALIVE_CHROMIUM_EXECUTABLE_PATH`, `APP_ORIGIN`, `AUDIT_SCOPE`, `SEEKALIVE_DB_MIGRATION_TRACK` | referências de build, testes, auditoria ou ferramenta; não são segredos de autenticação. Defaults/validações variam por consumidor e não foram todos rastreados até o último uso. |

**Comando:** inventário estático por `rg` no repositório, filtrando código e configurações de execução; usos de ambiente também passam por `infra/database/src/connection.ts`, que recebe `process.env` como objeto. Nenhum valor de variável foi lido.

**Limite:** a busca é estática e não consultou o ambiente nem prova que todos os scripts ou pacotes foram incluídos.

### 10-004 — Logs HTTP carregam ID de requisição e redigem cabeçalhos de autenticação

**Afirmação da doc:** Logs não devem registrar cookies nem query strings sensíveis.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — revisão estática; nenhum conteúdo de log foi acessado.

**Evidência:** `back/src/app.ts:14–38` gera UUID, registra método/URL sem query/status e envia `X-Request-Id`. `common/logger.ts:5–19` redige Authorization, Cookie e Set-Cookie.

**Trecho:** serializer reduz a URL a `req.url?.split("?")[0]`; a lista de redaction inclui `req.headers.cookie`.

### 10-005 — Readiness verifica apenas conectividade com PostgreSQL

**Afirmação da doc:** O endpoint de readiness é uma indicação de disponibilidade da aplicação.  
**Veredito:** PARCIAL  
**Risco:** Médio — pode responder `ready` mesmo se worker ou serviços não essenciais estiverem indisponíveis.

**Evidência:** `health/presentation/readinessRoutes.ts:6–12` executa callback do banco e retorna `ready`/503. `health/infrastructure/databaseReadiness.ts:3–6` executa `SELECT 1` com timeout de 1.500 ms. Não foram encontrados checks de Resend, worker de exclusão ou dependências de outros domínios nessa resposta.

**Trecho:** readiness faz `await checkDatabase()`; a consulta é somente `SELECT 1`.

### 10-006 — Shutdown tenta encerrar worker, servidor e pool com limite de dez segundos

**Afirmação da doc:** N/A — inspeção do ciclo de vida do processo.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — nenhum sinal foi enviado durante a auditoria.

**Evidência:** `back/src/index.ts:58–108` registra `SIGTERM`/`SIGINT`, interrompe o worker de exclusão, fecha servidor e pool e define timer de encerramento forçado de dez segundos. `:25–36` marca erro de listen como falha de processo.

**Trecho:** `process.once("SIGTERM", ...)`, `process.once("SIGINT", ...)` e `setTimeout(..., 10_000)`.

### 10-007 — Falha de inicialização do worker de exclusão é registrada, mas não bloqueia readiness

**Afirmação da doc:** N/A — consequência da composição atual do worker.  
**Veredito:** PARCIAL  
**Risco:** Médio — processo HTTP pode continuar disponível enquanto a exclusão agendada não é processada.

**Evidência:** `back/src/index.ts:41–55` inicia o worker após `listening`; a rejeição é apenas registrada. O readiness do achado 10-005 verifica somente o banco.

**Trecho:** `.catch(...)` registra `Account deletion worker failed to start`; não altera estado de readiness ou `process.exitCode`.

### 10-008 — Não há evidência de métricas ou alertas operacionais no servidor

**Afirmação da doc:** N/A — inventário de observabilidade no código.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — a auditoria não verificou plataforma externa de métricas/alertas.

**Evidência:** a busca `rg -n 'metrics|prometheus|opentelemetry|alert' Aplicativo/back/src --glob '*.ts'` não apresentou implementação de métricas/exporter no backend. Não foram consultados recursos de observabilidade externos nem logs de execução.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 4 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |


---

# 11 — Limites de taxa e abuso

## Escopo e método

Inventário estático dos limitadores Express, chaves, janelas, rotas sem limitador local identificado e ordem do parser. Não foram executados testes de carga, chamadas automatizadas ou alteração de configuração.

## Achados

### 11-001 — O código define 55 usos de limitador por endpoint

**Afirmação da doc:** N/A — inventário dos limites aplicados no código atual.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a presença de um limite não comprova que os valores sejam adequados sob carga.

**Evidência:** `rg -n 'createAuthRateLimit\\(' Aplicativo/back/src/modules --glob '*.ts'` retorna 55 chamadas. A tabela abaixo consolida todas as chamadas encontradas; a janela é fixa e expressa em chamadas por período.

| Domínio | Limites encontrados |
|---|---|
| Auth | `register` 5/15 min; `login` 10/15 min; `verify-resend` 3/15 min; `verify-confirm` 10/15 min; `device-login-confirm` 10/15 min; `device-login-resend` 5/15 min; `password-reset-request` 5/15 min; `password-reset-confirm` 10/15 min; `password-update` 5/15 min; `password-update-confirm` 10/15 min; `account-email-change-request` 5/15 min; `account-email-change-new-confirm` 10/15 min; `account-password-change-request` 5/15 min; `account-password-change-confirm` 10/15 min; `account-deletion-code` 5/15 min; `account-deletion-confirm` 10/15 min; `account-restoration-code` 5/15 min; `account-restoration-confirm` 10/15 min; `sessions-list` 60/15 min; `sessions-revoke-others` 10/15 min; `session-revoke` 20/15 min; `devices-list` 60/15 min; `devices-revoke-others` 10/15 min; `device-revoke` 20/15 min. |
| Profiles | `account-availability` 30/min; `account-profile-update` 30/15 min; `business-profile-review-create`, `business-profile-review-delete`, `business-profile-review-reply` 30/min cada. |
| Social | `social-account-search` 60/min; `social-follow` 60/min; `social-block` 30/min. |
| Feed | `feed-article-create` 10/min; `feed-article-read` 120/min; `feed-comment-create` 10/min; `feed-comment-delete` 30/min; `feed-comment-like` e `feed-comment-unlike` 90/min; `feed-comments-read` 120/min; `feed-global-list` 120/min; `feed-post-bookmark` e `feed-post-unbookmark` 60/min; `feed-post-create` 20/min; `feed-post-delete` 30/min; `feed-post-like` e `feed-post-unlike` 90/min; `feed-post-read` 120/min; `feed-post-reference-read` 120/min; `feed-post-repost` e `feed-post-unrepost` 30/min; `feed-profile-content` 120/min. |
| Media | `social-media-upload` 20/min; `social-media-read` 120/min; `social-media-delete` 30/min. |

### 11-002 — Os buckets são por IP e processo, não por identidade da conta

**Afirmação da doc:** O endereço IP é usado somente como sinal de rate limit, não como identidade permanente da instalação.  
**Veredito:** CONFIRMADO  
**Risco:** Médio — IP compartilhado pode causar bloqueios colaterais; múltiplos IPs podem multiplicar a cota efetiva.

**Evidência:** `security/rateLimit.ts:5–16` mantém um `Map` no processo e monta chave `${name}:${getTrustedClientIp(request) ?? request.ip ?? "unknown"}`. Não existe chave da conta autenticada nesse código.

**Trecho:** `const rateLimitBuckets = new Map<string, RateLimitBucket>();`.

### 11-003 — A instância não compartilha os limites com outros processos e a limpeza não impõe teto estrito

**Afirmação da doc:** N/A — escalabilidade e retenção de bucket.  
**Veredito:** PARCIAL  
**Risco:** Alto antes de escalar horizontalmente; Médio para crescimento de memória em distribuição ampla de IPs.

**Evidência:** `rateLimit.ts:23–27` remove buckets expirados somente após o mapa exceder 10.000 entradas; não limita entradas ainda ativas. Um reinício zera o estado, e réplicas mantêm mapas distintos.

**Trecho:** a limpeza condiciona-se a `rateLimitBuckets.size > 10_000` e remove apenas `value.resetAt <= now`.

### 11-004 — Quinze arquivos de rotas não têm `createAuthRateLimit` local

**Afirmação da doc:** N/A — identificação de rotas sem middleware local de rate limit.  
**Veredito:** PARCIAL  
**Risco:** Alto para endpoints de escrita/autenticação se não houver proteção equivalente herdada; alguns arquivos são liveness/readiness e não precisam da mesma política.

**Evidência:** o comando `for f in $(rg -l 'router\\.(get|post|put|patch|delete)\\(' Aplicativo/back/src/modules --glob '*.ts' | sort); do rg -q 'createAuthRateLimit\\(' "$f" || echo "$f"; done` retornou:

`auth/presentation/csrfRoutes.ts`; `health/presentation/livenessRoutes.ts`; `health/presentation/readinessRoutes.ts`; `onboarding/presentation/routes.ts`; `profiles/presentation/privacyRoutes.ts`; `profiles/presentation/publicProfileRoutes.ts`; `social/presentation/acceptFollowRequestRoutes.ts`; `social/presentation/blockListRoutes.ts`; `social/presentation/circleRoutes.ts`; `social/presentation/declineFollowRequestRoutes.ts`; `social/presentation/followerListRoutes.ts`; `social/presentation/followingListRoutes.ts`; `social/presentation/followRequestListRoutes.ts`; `social/presentation/unblockAccountRoutes.ts`; `social/presentation/unfollowAccountRoutes.ts`.

**Limite:** a verificação é por arquivo, não prova ausência de um limitador aplicado em router pai. O inventário de composição e middleware do bloco 02 não encontrou rate limiter global.

### 11-005 — A seleção de IP em cadeia de proxies pode escolher o salto incorreto

**Afirmação da doc:** N/A — avaliação da origem do IP usado no bucket.  
**Veredito:** PARCIAL  
**Risco:** Alto em ambiente com cadeia de proxies — buckets podem ser compartilhados pelo IP do proxy ou contornados conforme a topologia.

**Evidência:** `front/src/server/forwarded-client-ip.ts:6–11` percorre `X-Forwarded-For` da direita para a esquerda. `front/vite.config.ts:71–80` remove os headers encaminhados e define o header interno. `back/src/security/trustedClientIp.ts:16–23` só aceita esse header em socket loopback. A topologia futura não foi consultada.

**Trecho:** percorre a lista do último índice para o primeiro e retorna o primeiro IP válido.

### 11-006 — Parser de corpo roda antes dos limitadores das rotas

**Afirmação da doc:** N/A — análise da ordem de custo por requisição.  
**Veredito:** PARCIAL  
**Risco:** Médio — chamadas excedentes ainda podem consumir o custo de parsing do corpo permitido.

**Evidência:** `back/src/app.ts:41–50` aplica parser JSON (32 KiB padrão; 256 KiB para artigo) e urlencoded antes de montar `/api`. O rate limit de login, por exemplo, é aplicado internamente em `loginRoutes.ts:26`.

**Trecho:** `app.use("/api", router)` aparece após o middleware de parsing.

### 11-007 — O limitador retorna 429 e `Retry-After`, mas a janela é fixa

**Afirmação da doc:** N/A — comportamento de resposta.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — rajadas podem ocorrer na fronteira entre janelas; não há algoritmo deslizante/token bucket.

**Evidência:** `security/rateLimit.ts:13–34` incrementa contador e compara com limite; quando excede, retorna `429` e `Retry-After` calculado até o reset.

**Trecho:** `bucket.resetAt = now + windowMs`; excedido o limite, `sendApiError(response, 429, "RATE_LIMITED", ...)`.

### 11-008 — Adequação dos limites sob carga e em rede real não foi medida

**Afirmação da doc:** N/A — limite de validação de segurança somente leitura.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Alto antes de qualquer lançamento público.

**Evidência:** nenhum teste de carga, burst, múltiplas instâncias, IP compartilhado, proxy de múltiplos saltos ou bloqueio de conta foi executado. O ambiente de produção não foi acessado.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 4 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |


---

# 12 — Frontend e integração com a API

## Escopo e método

Mapeamento estático da seleção entre sessão real e demonstração, chamadas do cliente para Auth/Onboarding/Social/Profiles/Mídia, persistência no navegador e módulos que ainda usam fixtures ou dados locais. Nenhum login, fluxo E2E, ação de escrita na API ou verificação visual foi executado.

## Achados

### 12-001 — O aplicativo consulta a sessão real ao iniciar e não converte falha em logout

**Afirmação da doc:** N/A — verificação do fluxo de boot autenticado.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — falha de rede é exibida como indisponibilidade, não como sessão encerrada.

**Evidência:** `Aplicativo/front/src/modules/app/state/AppContext.tsx:64–85` chama `resolveAuthSession(getCurrentSession)` e marca `sessionCheckUnavailable` se a API falhar. `Aplicativo/front/src/App.tsx:23–47` exibe erro e retry. `auth/services/sessionApi.ts:30–34` chama `/auth/session`.

### 12-002 — Login, cadastro, sessão e onboarding enviam chamadas à API e validam contratos

**Afirmação da doc:** N/A — existência do cliente real.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — chamadas não foram executadas.

**Evidência:** `auth/services/loginApi.ts:16–42`, `registrationApi.ts:5–11` e `onboarding/services/onboardingApi.ts:3–11` implementam os fluxos. `app/api/httpClient.ts:75–104` usa cookies, obtém CSRF para escrita e valida respostas quando schemas são fornecidos.

**Trecho:** cadastro chama `postJson("/auth/register", payload, { 202: RegisterAccountResponse })`; cliente inclui `credentials: "include"`.

### 12-003 — O aplicativo separa explicitamente preview local e sessão Social remota

**Afirmação da doc:** Dados de demonstração não devem representar dados reais em produção.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a decisão de ambiente está implementada; o comportamento da compilação final não foi testado.

**Evidência:** `app/state/SocialApplicationContext.tsx:61–69` identifica sessão remota autenticada. `social/application/postActions.ts:78–87` escolhe REST fora de preview e serviço demonstrativo no preview. `AppContext.tsx:112–120` impede iniciar preview fora de `import.meta.env.DEV`; hidratação exige modo preview e build de desenvolvimento (`socialApplicationState.ts:42–46`, `SocialApplicationContext.tsx:168–196`).

### 12-004 — Feed remoto carrega e pagina publicações pela API

**Afirmação da doc:** N/A — ligação da tela de Feed.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — não houve chamada HTTP nem verificação de interação no navegador.

**Evidência:** `social/screens/Feed.tsx:224–266,268–305` carrega e pagina o feed remoto; `social/services/restContracts.ts:85–176` chama feed, post, comentário, curtida, repost, favoritos e publicações de perfil, validando objetos selecionados.

### 12-005 — Perfis e relações usam um serviço denominado Social para ler e editar dados de perfil

**Afirmação da doc:** A rede Social origina as contas; Profiles é dono dos dados e apresentação de perfil.  
**Veredito:** CONTRADITO  
**Risco:** Alto — acoplamento cruzado pode encaminhar manutenção e ownership de perfil para o domínio errado.

**Evidência:** `modules/profile/hooks/useProfileEditController.ts:5–11,81–100,205–225` importa `socialGraphApi` para carregar/alterar a própria conta. O endpoint e caso de uso correspondentes estão em Profiles; o desvio está detalhado no apêndice de fronteiras.

**Trecho:** `socialGraphApi.getMyAccount()` e `socialGraphApi.updateMyAccount(patch)` são chamados pelo controlador de Profile.

### 12-006 — Avaliações comerciais têm um adaptador remoto próprio, mas há também armazenamento local

**Afirmação da doc:** O perfil comercial mostra avaliações de Profiles; os dados locais de demonstração não devem substituir o backend autenticado.  
**Veredito:** PARCIAL  
**Risco:** Alto para consistência — existe API remota e armazenamento de navegador, e a seleção efetiva entre ambos precisa ser validada em tela.

**Evidência:** `profile/commercial-profile/services/businessProfileReviewApi.ts:29–56` chama endpoints remotos; `profile/commercial-profile/data/businessProfileReviewStorage.ts:31–45` lê/grava `localStorage`. A auditoria não executou UI para confirmar qual adaptador é selecionado em cada modo.

### 12-007 — Seek usa catálogo e filtros locais, sem endpoint de descoberta no backend

**Afirmação da doc:** Seek deve descobrir perfis comerciais originados no Social.  
**Veredito:** PARCIAL  
**Risco:** Alto para a funcionalidade Seek — a tela não consome dados reais de descoberta.

**Evidência:** `seek/services/seekLocationService.ts:40` carrega catálogo de cidades local; `seek/hooks/useSeekDiscovery.ts:42–48,99–126` guarda favoritos/filtros e exemplos em armazenamento do navegador. Busca por `apiRequest|getJson|postJson|fetch|/api/v1` no módulo encontrou somente o fetch do catálogo local. Não existe endpoint Seek no backend (bloco 11 da arquitetura).

### 12-008 — Estado local da interface não é compartilhado entre dispositivos

**Afirmação da doc:** Dados persistentes necessários ao produto devem vir do backend; itens demonstrativos podem ser locais.  
**Veredito:** PARCIAL  
**Risco:** Médio — ações/preferences guardadas apenas no navegador não acompanham a conta para outro dispositivo.

**Evidência:** `app/persistence/accountActivityStorage.ts:76–91`, `profile/data/accountStorage.ts:21–56`, `profile/commercial-profile/data/businessProfileReviewStorage.ts:31–45`, `social/data/followRequestStorage.ts:17–28` e `settings/data/browserPreferenceStorage.ts:4–14` usam `localStorage`; Seek também usa `sessionStorage` para filtros/estado recente.

**Limite:** este inventário não declara todos esses dados como falha; algumas são preferências/demonstrações intencionais. Não foi lido conteúdo real do navegador.

### 12-009 — Não foram encontrados sinks React de HTML bruto no frontend pesquisado

**Afirmação da doc:** N/A — busca estática por sinks comuns de HTML.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — não substitui revisão de URLs, atributos e componentes de terceiros.

**Evidência:** busca `rg -n 'dangerouslySetInnerHTML|\\.innerHTML\\s*=|insertAdjacentHTML|srcDoc' Aplicativo/front/src --glob '*.{ts,tsx,js,jsx}'` retornou `No matches`. Texto React normal é escapado por padrão; nenhum HTML bruto foi identificado por esses padrões.

### 12-010 — O frontend usa mais de um transporte e as diferenças de contrato não foram testadas de ponta a ponta

**Afirmação da doc:** N/A — risco de alinhamento entre clientes e servidor.  
**Veredito:** PARCIAL  
**Risco:** Médio — mudanças de CSRF, paths, erros e schemas podem divergir entre adapters.

**Evidência:** Auth usa `app/api/httpClient.ts`; Social usa `social/services/socialHttp.ts`, `restContracts.ts` e operações Orval em `socialGraphApi.ts`. O bloco 02 documenta divergências OpenAPI/rotas; nenhum teste de contrato cliente-servidor foi executado.

### 12-011 — Fluxos visuais e E2E não foram executados

**Afirmação da doc:** N/A — limite do modo read-only.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Alto para declarar o frontend pronto para produção.

**Evidência:** não houve login de teste, navegação autenticada, envio de formulário, inspeção de responsividade ou execução de Playwright. A execução de testes é proibida pelo prompt; ver bloco 14.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 4 |
| CONTRADITO | 1 |
| NÃO VERIFICADO | 1 |


---

# 13 — Ciclo de vida, restauração e exclusão da conta

## Escopo e limites

Confronto estático da regra aprovada com os casos de uso, endpoints, worker e FKs declaradas. Não foi solicitada nem executada exclusão de conta, teste de usuário ou leitura de registros de negócio. Nenhum dado de usuário foi consultado.

## Achados

### 13-001 — A regra de sete dias mais noventa dias está codificada

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `accounts/domain/accountDeletionPolicy.ts:1–21` define prazo de graça de sete dias e calcula retenção de noventa dias a partir de `deletionScheduledFor`. O prazo de restauração termina estritamente antes da data agendada (`:24–36`); portanto, o fluxo retém o registro por até 97 dias após a confirmação inicial, salvo atraso do worker.

**Trecho:** `ACCOUNT_DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000`; `deletionScheduledFor.getTime() + ACCOUNT_DELETION_RETENTION_PERIOD_MS`.

### 13-002 — A solicitação desativa a conta e encerra a sessão após confirmação por código

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/presentation/accountDeletionRoutes.ts:55–97` exige sessão ativa e envia código ao e-mail atual; `:122–171` confirma o código, agenda a exclusão e limpa cookies de sessão e pré-autenticação. O endpoint aplica rate limit e CSRF. Não há envio de e-mail de confirmação adicional nessa rota; o envio observado é o do código solicitado.

**Trecho:** em sucesso, `response.clearCookie(SESSION_COOKIE, ...)`, `response.clearCookie(PRE_AUTH_COOKIE, ...)` e `status: "deletion_scheduled"`.

### 13-003 — A restauração exige senha e código e só é aceita antes do prazo

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** a tela de login encaminha `account_deletion_pending` ao painel de restauração (`front/src/modules/auth/application/useLoginSubmission.ts:33–46`). `AccountRestorationPanel.tsx:82` exibe o prazo ao titular. `accountDeletionRoutes.ts:176–231` pede identifier/senha antes de enviar o código e `:235–285` autentica novamente identifier/senha, confirma o código e devolve conflito quando o prazo terminou.

**Trecho:** `loginOperations.authenticate(parsed.data.identifier, parsed.data.password, null)` antes de solicitar e antes de confirmar o código.

### 13-004 — Existe worker para transicionar e purgar contas vencidas

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/infrastructure/accountDeletionWorker.ts:5–14,16–41` executa lote inicial e repetição a cada 60 segundos, loteando até 50 ações pelo finalizador (`auth/composition/accountDeletionFinalization.ts:6–14`). O processo importa e inicia o worker quando o servidor escuta (`Aplicativo/back/src/index.ts:38–48`).

**Trecho:** `const INTERVAL_MS = 60_000`; `const timer = setInterval(() => void run(), INTERVAL_MS)`.

### 13-005 — A retenção reserva o @ por 30 dias e depois mantém a conta retida por mais 90

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/infrastructure/accountDeletionRetentionRepository.ts:36–76` define `reservationExpiresAt` como `deletionRequestedAt + USERNAME_RESERVATION_MS` e registra/atualiza a reserva. `:79–98` define o estado `deletion_retained` e `deletionRetentionUntil` a partir do prazo de exclusão de sete dias.

**Trecho:** `account.deletionRequestedAt.getTime() + USERNAME_RESERVATION_MS`; depois `status: "deletion_retained"`.

### 13-006 — A exclusão final remove registros por cascata nos domínios implementados

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `auth/infrastructure/accountDeletionPurgeRepository.ts:9–37` seleciona somente contas em `deletion_retained` cujo prazo venceu, apaga arquivos de mídia e então executa `DELETE accounts`. Os schemas declaram `ON DELETE CASCADE` para registros de segurança, Profiles/Relações, publicações, comentários, curtidas, reposts, favoritos e ativos (`infra/database/src/schema/security/schema.ts`; `profiles/accountProfiles.ts`, `profiles/businessProfiles.ts`, `profiles/relationships.ts`, `profiles/businessProfileReviews.ts`; `feed/posts.ts`, `postComments.ts`, `postLikes.ts`, `postReposts.ts`, `postBookmarks.ts`; `media/assets.ts`). O catálogo somente foi lido; a cascata não foi exercitada neste dossiê.

**Trecho:** o purge exclui `accounts` depois de `purgeAccountMediaFiles(account.id)`; por exemplo, `feed/posts.ts` declara `.references(() => accounts.id, { onDelete: "cascade" })`.

**Impacto:** as relações implementadas serão removidas conforme as FKs declaradas e as contagens calculadas em leituras seguintes refletirão as linhas removidas. Isso não comprova a execução completa de uma purga real.

### 13-007 — A preservação e anonimização de mensagens ainda não têm implementação

**Veredito:** PARCIAL  
**Prioridade:** Alta para o fechamento do escopo Social

**Evidência:** `Aplicativo/back/src/modules` não contém módulo Messages nem suas tabelas/rotas; o bloco 11 confirmou também que as pastas de frontend Messages e Notifications não fazem chamadas de rede. Assim, não existe mecanismo de exclusão que preserve o conteúdo de conversas e anonimize o remetente conforme a regra aprovada.

**Trecho:** o registro ativo de rotas (`Aplicativo/back/src/modules/index.ts:13–19`) não monta router de mensagens; a busca de rede do bloco 11 não encontrou chamadas nos módulos frontend Messages/Notifications.

**Impacto:** não há mensagens remotas a purgar nesta versão, mas a regra deverá ser implementada no domínio Messages antes que esse recurso seja conectado a dados reais.

### 13-008 — A remoção de arquivos depende do armazenamento local de desenvolvimento

**Veredito:** PARCIAL  
**Prioridade:** Alta antes de usar armazenamento permanente

**Evidência:** `media/composition/accountMediaPurge.ts:14–24,27–30` remove os arquivos via `localMediaFileStore` e lança erro se houver ativos fora de `development`. `accountDeletionPurgeRepository.ts:24–25` invoca a remoção dentro da transação que exclui a conta.

**Trecho:** `if (assets.length > 0 && !isLocalDevelopment()) throw new Error("Account media purge requires the configured storage provider.");`.

**Impacto:** o caminho atual é coerente com o armazenamento local de desenvolvimento. O armazenamento permanente futuro precisará fornecer a operação de purge equivalente; sem ela, a conta vencida não será apagada enquanto tiver ativos. A chamada de filesystem dentro da transação também torna a operação externa não reversível se a transação falhar depois.

### 13-009 — Se o schema não estiver pronto na inicialização, o worker não tenta novamente

**Veredito:** PARCIAL  
**Prioridade:** Média — operação de desenvolvimento

**Evidência:** `accountDeletionWorker.ts:7–14` verifica a disponibilidade do schema uma vez e retorna uma função vazia se a migration ainda não estiver pronta; não agenda nova verificação nesse ramo.

**Trecho:** `if (!(await isAccountDeletionSchemaReady())) { ... return () => undefined; }`.

**Impacto:** aplicar a migration após esse worker ter iniciado não o reativa sozinho; será necessário reiniciar o processo ou adicionar uma política de nova tentativa antes de depender dele nessa situação.

### 13-010 — A purga e as cascatas não foram validadas por execução nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta antes de declarar o fluxo integralmente aceito

**Evidência:** o prompt limita esta auditoria a leitura e proíbe execução de testes, mutações ou acesso a dados pessoais/de negócio. As referências históricas de testes em outros documentos não foram reproduzidas aqui. O bloco 14 separará validações estáticas, testes históricos e testes ainda necessários.

### 13-011 — O código distribui dados pessoais e sensíveis entre Accounts, Auth, Profiles, Feed e Media

**Afirmação da doc:** N/A — inventário técnico dos campos por schema solicitado pelo prompt.

**Veredito:** PARCIAL
**Risco:** Alto — o dossiê identifica as categorias principais, mas não comprova uma matriz completa de todos os campos, cópias, logs e fluxos de exportação.

**Evidência:**

| Domínio/tabela | Campos/categorias identificados em código |
|---|---|
| `accounts.accounts` | identificador, `username`, `age`, tipo/status da conta (`infra/database/src/schema/accounts/schema.ts:18–22`). |
| `accounts.account_emails` | e-mail normalizado e estado de verificação (`schema.ts:115–130`). |
| `security` | `password_hash`, hashes de tokens/sessões/dispositivos, e-mail pendente (`infra/database/src/schema/security/schema.ts:18,38–40,68,93`). |
| `profiles.account_profiles` | nome, sobrenome, nome de exibição, bio, localidade e site (`infra/database/src/schema/profiles/accountProfiles.ts:9–14`). |
| `profiles.business_profiles` | endereço, cidade, estado e país (`infra/database/src/schema/profiles/businessProfiles.ts:11–15`). |
| `feed` | texto de publicações/artigos, comentário, IDs de autor e referências de mídia (`infra/database/src/schema/feed/posts.ts:18–30`; `postComments.ts:28–36`). |
| `media.assets` | proprietário, chave de armazenamento, tipo, content type, tamanho e estado (`infra/database/src/schema/media/assets.ts:16–31`). |

**Logs:** `app.ts:18–30,62–78` registra método, URL sem query, status e somente nome/código para erro genérico; `common/logger.ts:5–19` redige Authorization/Cookie/Set-Cookie. Os avisos de envio de e-mail usam códigos de erro (`auth/application` e rotas de cadastro, ver bloco 09). O worker também registra `{ err: error }` (`auth/infrastructure/accountDeletionWorker.ts:29–31`); não foi inspecionado conteúdo de logs reais nem demonstrado que todas as mensagens de erro excluam dados pessoais.

**Limite:** não foram lidas linhas de negócio. O inventário é de colunas/código, não de valores armazenados; não cobre snapshots, backups ou serviços externos.

### 13-012 — A data de nascimento não é armazenada, mas a idade calculada continua persistida

**Afirmação da doc:** A pessoa informa a data para o backend validar 18+; idade não deve ser pública nem aparecer após o cadastro.

**Veredito:** PARCIAL
**Risco:** Médio — a data exata não é retida, mas o atributo calculado permanece em `accounts` e a auditoria não demonstra todos os consumidores nem a ausência em toda resposta privada.

**Evidência:** `accounts/domain/accountAgeEligibility.ts:42–70` valida data e retorna idade calculada. `accounts/infrastructure/accountRegistrationRepository.ts:56` persiste `age`; `infra/database/src/schema/accounts/schema.ts:21,69` declara a coluna e check `18 <= age <= 120`. Busca estática de `age`, `dateOfBirth`, `birthDate` e `birth_date` no backend/schema/contracts encontrou apenas o gate, o campo persistido, a constraint e o schema de cadastro; `04-004` confirma ausência no DTO público.

**Trecho:** `age: input.age`; `if (age < 18) ...; if (age > 120) ...; return { kind: "eligible", age };`.

**Limite:** a busca não substitui teste de todas as respostas privadas nem confirma o que a tela autenticada renderiza; nenhuma navegação foi executada.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 6 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** testes existentes, cobertura e validações permitidas sem executar mutações.


---

# 14 — Testes, cobertura e validação

## Limite desta etapa

Este bloco é um inventário estático dos arquivos e scripts de teste. Não executa `pnpm test`, testes isolados, typecheck, lint, build, codegen, migrations, servidor ou browser. Portanto, não atesta que qualquer teste passa hoje.

## Achados

### 14-001 — Há testes unitários e de integração distribuídos pelo front, backend e banco

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** inventário por `find` encontrou 40 arquivos de teste em `Aplicativo/back/test`, 21 em `Aplicativo/front/tests` e 1 em `infra/database/test`. A busca `rg -n '\b(test|it)\s*\(' ...` encontrou 333 ocorrências de declarações/chamadas de casos; essa contagem textual não foi executada e não equivale a cobertura. Os testes do backend abrangem autenticação, cadastro, segurança de sessão/dispositivo, exclusão de conta, Profiles, Social, Feed, Media e limites de camada. O frontend inclui testes de API, estado, telas e 5 fluxos E2E de autenticação.

**Trecho da saída:** `40`, `21`, `1`; arquivos nomeados como `auth-registration-injection`, `feed-visibility`, `profilePresentation` e `authFlows.e2e`.

### 14-002 — O comando padrão não inclui a suíte dedicada de exclusão de conta

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `package.json:11` define `test:account-deletion` separadamente. O `test` padrão (`package.json:12`) não chama esse script. A suíte de exclusão também inclui `account-deletion-policy.test.mjs`, exposta como `test:accounts-deletion-policy` em `scripts/package.json:14`, mas ausente de `scripts/package.json:18` (`test:backend`). Assim, a existência dos testes não significa que a rotina geral os execute.

**Trecho:** script isolado de exclusão é declarado na linha 11; o `test` padrão encadeia `test:social`, `test:backend` e uma lista explícita de outros arquivos, sem incluir os três testes isolados nem a policy.

**Impacto:** a automação de validação precisa dizer explicitamente quais suites compõem o “teste completo”; hoje há suites que só executam por comando separado.

### 14-003 — Os testes E2E do frontend são separados e dependem da aplicação/browser de teste

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `Aplicativo/front/package.json:11–15` oferece cinco scripts `test:e2e:*`, mas não são chamados pelo `test` da raiz. `tests/e2e/authFlows.e2e.test.mjs:1–18` importa utilitários de browser e chama `verifyLocalAppIsRunning()` antes de iniciar o navegador.

**Trecho:** `await verifyLocalAppIsRunning(); browser = await launchAuthTestBrowser();`.

**Impacto:** estes testes precisam de um ambiente de preview controlado e não devem ser confundidos com testes unitários sem browser.

### 14-004 — A busca de locais possui teste que não está ligado ao runner padrão do frontend

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `Aplicativo/front/tests/seekDiscovery.test.ts` existe. A lista explícita de entradas de `scripts/test-social.mjs:13–28` não inclui esse arquivo; `Aplicativo/front/package.json:6–15` não define script unitário para ele. Não foi encontrado vínculo em outro script padrão.

**Trecho:** a lista `testEntries` inclui 15 testes de frontend e não contém `seekDiscovery.test.ts`.

### 14-005 — O executor de testes sociais compila temporariamente os testes antes de rodá-los

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `scripts/test-social.mjs:11–12,30–53` cria uma pasta temporária, empacota entradas TypeScript com esbuild, executa `node --test` e remove a pasta em `finally`. É uma execução de teste com artefatos temporários, não uma simples descoberta automática de todos os arquivos.

**Trecho:** `mkdtemp(...)`; depois `spawnSync(process.execPath, ["--test", ...testFiles])`; por fim `rm(directory, { recursive: true, force: true })`.

### 14-006 — O escopo executável de testes do Feed existe; o backend de Seek ainda não tem suite

**Veredito:** PARCIAL  
**Prioridade:** Informativa para Feed; esperada para Seek ainda não implementado

**Evidência:** existem testes de Feed para visibilidade, contagens, listagem, hashtags e injeção de dependências (`Aplicativo/back/test/feed-*.test.mjs`). O inventário do bloco 11 não encontrou implementação REST/serviços do backend Seek, portanto não há comportamento backend Seek a testar nesta etapa.

**Trecho:** lista de arquivos inclui `feed-visibility`, `feed-post-counts`, `feed-global-listing`, `feed-hashtag-policy`; o diretório backend `modules/seek` não contém fonte executável.

### 14-007 — Não há script de lint declarado nos manifests examinados

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** scripts raiz, backend, frontend, scripts e database foram listados nos blocos 02/11 e nesta etapa. Há `typecheck`, `build`, `test` e `check` de migrations, mas não foi encontrado script `lint`/`format:check` nesses manifests.

**Trecho:** `package.json` raiz declara `test`, `build`, `typecheck:libs` e `typecheck`; `Aplicativo/front/package.json` declara `build`, `serve`, `typecheck` e E2E.

**Impacto:** isso não prova baixa qualidade de formatação; apenas que o fluxo automatizado de lint/format não está exposto nesses comandos.

### 14-008 — Typecheck, build, migrations e testes não foram executados nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta antes de qualquer gate de validação

**Evidência:** o prompt aplicável restringe este trabalho a auditoria estática e proíbe testes, builds, codegen, migrations e processos. Os comandos encontrados são evidência de disponibilidade, não de resultado atual. Nenhuma afirmação de “passou” é feita neste bloco.

**Trecho:** execução omitida por restrição expressa de escopo; comandos identificados nos manifests: `pnpm test`, `pnpm typecheck`, `pnpm build`, `drizzle-kit check` e `test:baselines`.

### 14-009 — Não foram encontrados marcadores skip/todo, pipeline CI ou configuração de cobertura no escopo pesquisado

**Afirmação da doc:** N/A — inventário estático de qualidade solicitado pelo prompt.

**Veredito:** CONFIRMADO
**Risco:** Informativo — não há evidência local de execução automatizada contínua nem medição de cobertura.

**Evidência:** buscas por `.skip(...)`, `.todo(...)`, `test.skip`, `it.skip` e `describe.skip` nos diretórios de teste não retornaram resultados. `find` até cinco níveis não localizou workflows de CI nem arquivos/configurações de cobertura; busca de `TODO|FIXME|HACK|XXX` em `Aplicativo`, `infra`, `shared` e `scripts` não retornou resultados. Os manifests expõem scripts manuais, mas isso não demonstra pipeline externo.

**Trecho da saída:** nenhuma correspondência para marcadores de teste incompleto, nenhum arquivo de cobertura/workflow no escopo pesquisado e nenhuma ocorrência dos marcadores de manutenção.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** síntese, riscos prioritários e plano de ação por etapas com gates de revisão.


---

# Apêndice A1 — Fronteiras de domínio e módulos existentes

> Material suplementar do dossiê, não é o bloco oficial 11. O inventário de rate limits está em [11-limites-de-taxa-abuso.md](11-limites-de-taxa-abuso.md). Este apêndice é incluído uma única vez no consolidado e seus achados contam no total geral.

## Escopo e método

Leitura das árvores de módulos, do registro de rotas, das trilhas de migração e dos imports entre fronteiras. A existência de uma pasta não foi considerada prova de funcionalidade; cada conclusão foi confrontada com o código de composição e os pontos de entrada.

## Achados

### A1-001 — O backend registra somente Auth, Onboarding, Profiles, Social, Feed, Media e Health

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `Aplicativo/back/src/modules/index.ts:13–19` monta esses roteadores. O inventário de diretórios de `Aplicativo/back/src/modules` mostra Accounts, Profiles, Social, Feed, Media, Auth, Onboarding, Health e Seek; não há módulos backend Messages, Notifications ou Shop. Accounts contém domínio e repositórios consumidos por Auth, mas não um roteador próprio. Seek não contém arquivos fonte.

**Trecho:**

```ts
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);
router.use("/v1", accountsRouter);
router.use("/v1/social", relationsRouter);
router.use("/v1/social", createMediaRouter(readFeedPost));
router.use("/v1/social", feedRouter);
```

**Impacto:** o estado atual tem uma parte funcional de Auth/Profiles/Social/Feed/Mídia, mas não representa o backend completo da rede social e dos módulos futuros. Messages e Notifications continuam pendentes para fechar o escopo Social; Shop permanece fora do escopo desta etapa.

### A1-002 — O alias `accountsRouter` aponta para o roteador de Profiles

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** `Aplicativo/back/src/modules/index.ts:6,16` importa `profiles/composition/router` sob o nome `accountsRouter` e monta o alias em `/v1`.

**Trecho:** `import accountsRouter from "./profiles/composition/router";` seguido de `router.use("/v1", accountsRouter);`.

**Impacto:** o comportamento de roteamento não muda por causa do nome, mas a composição encobre a fronteira que o próprio código já estabeleceu e pode induzir manutenção no domínio errado.

### A1-003 — A inicialização de Profiles acontece dentro da transação de cadastro orquestrada por Auth

**Veredito:** PARCIAL  
**Prioridade:** Média — limitação de futura separação física

**Evidência:** `auth/composition/registration.ts:1–17` injeta a criação da identidade de Accounts e os inicializadores de Profiles no coordenador de cadastro. `auth/infrastructure/registrationAccountCoordinator.ts:45–80` executa identidade, credencial, perfil pessoal e perfil comercial usando o mesmo `runInTransaction`.

**Trecho:**

```ts
return dependencies.runInTransaction(async (transaction) => {
  const account = await dependencies.createPendingAccountIdentity(transaction, ...);
  await dependencies.createInitialPasswordCredential(transaction, account.id, ...);
  await dependencies.initializeAccountProfile(transaction, account.id, ...);
  if (input.accountType === "commercial") {
    await dependencies.initializeCommercialProfile(transaction, account.id, ...);
  }
});
```

**Impacto:** a separação lógica por schema funciona no banco compartilhado de desenvolvimento e preserva a atomicidade do cadastro. A mesma transação não pode abranger bancos físicos independentes; a estratégia de provisionamento futuro precisará de uma coordenação transacional distribuída/recuperável antes de separar fisicamente esses domínios. Não se recomenda alterar agora o fluxo aprovado.

### A1-004 — A escrita de Feed acopla diretamente a infraestrutura de Media

**Veredito:** PARCIAL  
**Prioridade:** Média — fronteira transacional

**Evidência:** `feed/composition/postPersistence.ts:1–14` importa repositórios e armazenamento local diretamente de `media/infrastructure`. `:32–74` usa uma transação para validar ativos staged, persistir o post e anexar os ativos.

**Trecho:** `import { attachStagedMediaAssets, findStagedMediaAssets } from "../../media/infrastructure/mediaAssetRepository";` e `return db.transaction(async (transaction) => { ... attachStagedMediaAssets(transaction, ...) ... });`.

**Impacto:** isso assegura atomicidade no banco compartilhado atual, mas atravessa a camada interna de infraestrutura do domínio Media. Uma extração física de Feed e Media exigirá um contrato de integração e compensação/reconciliação; a transação atual não atravessará duas bases físicas.

### A1-005 — A edição de perfil do frontend consome API pertencente ao cliente Social

**Veredito:** CONTRADITO  
**Prioridade:** Alta — ownership de domínio

**Evidência:** `front/src/modules/profile/hooks/useProfileEditController.ts:5–11` importa `socialGraphApi` do domínio Social. `:81–100` carrega a conta por `socialGraphApi.getMyAccount`; `:205–225` salva alterações com `socialGraphApi.updateMyAccount`. O backend possui roteador e casos de uso próprios em Profiles.

**Trecho:**

```ts
import { myAccountToUser, socialGraphApi } from "@/modules/social/services/socialGraphApi";
...
socialGraphApi.getMyAccount().then(...);
...
const response = await socialGraphApi.updateMyAccount(patch);
```

**Impacto:** relações sociais pertencem a Social, mas edição e apresentação de dados pessoais/comerciais pertencem a Profiles conforme a fronteira definida para o projeto. A tela Profile atualmente depende do serviço de Social para dados de perfil; esta dependência deve ser realocada para adapter/serviço de Profiles antes de declarar essa separação concluída. Não foi alterado nenhum contrato ou comportamento nesta auditoria.

### A1-006 — Perfil e Feed se integram por composição explícita; a dependência precisa continuar unilateral

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `feed/composition/router.ts:2–3` importa o leitor público de Profiles e a consulta de seguindo de Social no ponto de composição do Feed. A tela Profile consome publicações através do estado de aplicação Social (`app/state/SocialApplicationContext.tsx:243–255`). Isso confirma a direção observada nesses pontos, sem afirmar ausência de outras dependências não citadas.

**Trecho:** `import { accountViewsByIds } from "../../profiles/composition/publicApi";` e `import { listFeedFollowingAccountIds } from "../../social/composition/feedIntegration";`.

**Impacto:** a composição reúne dados necessários ao Feed sem declarar que Feed seja dono do perfil ou das relações. Manter esse acesso nos pontos de composição/contratos evita dependência de repositórios internos entre domínios.

### A1-007 — A pasta e o schema de Seek existem, mas não há execução de backend nem trilha de migração

**Veredito:** PARCIAL  
**Prioridade:** Prevista para após o fechamento do núcleo Social

**Evidência:** `Aplicativo/back/src/modules/seek` não contém arquivos, o roteador de Seek não aparece em `modules/index.ts:13–19` e `infra/database/src/schema/seek` existe. `infra/database/migrationTrackConfig.ts:4–30` registra somente `accounts`, `security`, `profiles`, `feed` e `media`, sem `seek`.

**Trecho:** as trilhas ativas terminam em `media: { schema: "media", source: "./src/schema/media/*.ts", ledgerTable: "media_migrations" }`; não há entrada `seek`.

**Impacto:** a presença de diretório não deve ser comunicada como módulo implementado. É coerente não ligar a descoberta Seek antes de fechar Social, mas o schema vazio e a ausência de trilha precisam ser tratados na etapa Seek, sem antecipar criação de domínio funcional agora.

### A1-008 — Mensagens e notificações têm pastas de frontend, sem módulo ou endpoint backend correspondente

**Veredito:** PARCIAL  
**Prioridade:** Alta para concluir a rede Social

**Evidência:** a árvore frontend contém `modules/messages` e `modules/notifications`. A lista backend não contém esses módulos; `modules/index.ts:13–19` não monta seus roteadores. O comando `rg -n 'fetch\\(|/api/v1|postJson|getJson|apiRequest|restSocialApi' Aplicativo/front/src/modules/messages Aplicativo/front/src/modules/notifications --glob '*.{ts,tsx}'` não encontrou chamadas de rede nesses módulos.

**Trecho:** o registro ativo termina com `router.use("/v1/social", feedRouter);`; nenhum roteador de mensagens/notificações é montado.

**Impacto:** não é possível considerar a rede social integralmente pronta para produção enquanto os fluxos de mensagem e notificação esperados no produto permanecerem somente na interface/estado local. Essa pendência deve ser incluída no plano antes de avançar para outro módulo.

## Contagem deste apêndice A1

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 4 |
| CONTRADITO | 1 |
| NÃO VERIFICADO | 0 |

**Uso no dossiê:** as fronteiras e ausências de módulos também alimentam os riscos priorizados em `99-sintese-lacunas.md`.


---

# Apêndice A2 — Documentos, contratos e decisões registradas

> Material suplementar do dossiê, não é o bloco oficial 12. O bloco 12 é [12-frontend-integracao-api.md](12-frontend-integracao-api.md). Este apêndice é incluído uma única vez no consolidado e seus achados contam no total geral.

## Escopo e método

Confronto dos documentos de arquitetura, módulo, API, readiness e auditorias históricas com o código, os catálogos de desenvolvimento já consultados e os blocos anteriores deste dossiê. Nenhum documento legado foi apagado ou reescrito. A comparação das três cópias anexadas foi feita por SHA-256.

## Achados

### A2-001 — O README identifica corretamente a especificação ativa e o catálogo futuro

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `docs/api/backend/README.md:13,18` define `shared/api-spec/openapi.yaml` como fonte dos contratos ativos e declara que `endpoints.md`/`openapi.json` incluem propostas. O bloco 02 confirmou essa distinção na configuração Orval e comparou os handlers com as rotas.

**Trecho:** `shared/api-spec/openapi.yaml` é “a fonte de verdade dos contratos ativos”; `docs/api/backend/openapi.json` é “catálogo separado de referência/propostas”.

### A2-002 — A propriedade das avaliações comerciais está contraditória entre documentos

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `docs/api/backend/README.md:26–28` inclui “avaliação” entre as entidades centrais de Seek. Em contraste, `docs/architecture/database-domains.md:43` proíbe Seek de criar ou responder avaliações; `docs/api/backend/implementation-and-tests.md:54–55` atribui a API de avaliações a Profiles. A implementação e rotas encontradas no bloco 04 também estão em Profiles, alinhadas à regra declarada pelo usuário.

**Trecho:** README: `Seek ... Entidades centrais ... avaliação`; arquitetura: `Seek ... Não deve possuir ... criação/resposta de avaliações`; plano: `A API de avaliações pertence a Profiles`.

**Impacto:** a documentação principal do backend pode induzir uma implementação incorreta e deve ser corrigida para que Seek consuma apenas projeção/agregado autorizado do perfil comercial.

### A2-003 — Há duas regras incompatíveis para publicação com audiência privada

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `docs/api/backend/architecture-and-security.md:199` afirma que audiência `private` é somente do titular. `docs/api/backend/data-dictionary.md:15` afirma que, após aprovação, seguidores podem ver publicações `public` e `private` de perfil privado. `feed/application/postVisibility.ts:26–35` implementa a segunda regra: segue aceito no perfil privado libera a publicação com audiência privada; Círculo ainda exige mutualidade.

**Trecho:** `post.audience === "private" && author.isPrivate && author.relationship.following === "accepted"`; a regra textual “audiência privada é somente do titular” diverge disso.

**Impacto:** a regra de negócio já aprovada e o código apontam para seguidores aprovados; a documentação de segurança precisa deixar claro o significado de “audiência privada” versus “perfil privado”, sem alterar a regra durante esta auditoria.

### A2-004 — Os documentos de migrations não refletem a configuração executável atual

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `docs/architecture/database-migration-tracks.md:17–22` lista `seek` como track ativo e `:30–41` descreve baseline/ledger. Já `infra/database/migrationTrackConfig.ts:4–30` permite apenas `accounts`, `security`, `profiles`, `feed` e `media`. Também há contradição interna: `accounts-security-workflows.md:108,114` afirma “Não há track Feed ativo”, enquanto `database-migration-tracks.md:20–23,41` e a configuração executável incluem Feed.

**Trecho:** configuração executável encerra as entradas ativas em `media`; o documento de trilhas inclui `seek`; outro documento diz `Não há track Feed ativo`.

**Impacto:** antes de qualquer aplicação futura, os documentos de migração precisam ser harmonizados com a configuração que efetivamente permite gerar/aplicar cada track. Este dossiê não executou geração ou migration.

### A2-005 — A auditoria histórica de contratos tem contagens obsoletas

**Veredito:** CONTRADITO  
**Prioridade:** Média

**Evidência:** `auditoria/04-contratos-documentacao-e-validacoes.md:19–22` registra 49 operações no OpenAPI ativo e 138 candidatas no catálogo. O confronto atual do bloco 02 encontrou 74 operações no YAML ativo e 146 no catálogo documental, além de 76 operações implementadas no servidor. A própria auditoria antiga descreve um corte anterior; seus números não devem ser reaproveitados como estado atual.

**Trecho:** relatório histórico: `49 operações` e `138 operações candidatas`; bloco 02: `74`, `146` e `76`, respectivamente, com método de contagem e fonte explicitados.

### A2-006 — O mapa de módulos documentado não lista todos os módulos executáveis

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `docs/modules/README.md:5–10` lista Auth, Onboarding, Profiles, Social e Health, mas não Feed nem Media. A árvore e a montagem efetiva do backend incluem esses domínios (bloco 11). O documento reconhece em `:18` que a separação em camadas ainda não é completa.

**Trecho:** lista resumida termina em `health`; o registro executável também monta `feedRouter` e `createMediaRouter`.

**Impacto:** a página pode servir como mapa de módulos de produto, mas não como inventário técnico completo do backend. O dossiê é o inventário verificado para este corte.

### A2-007 — A extração dos campos de apresentação de Accounts para Profiles está declarada como pendente

**Veredito:** CONFIRMADO  
**Prioridade:** Alta

**Evidência:** `docs/architecture/database-domains.md:37` atribui a fonte oficial do perfil a Profiles, mas registra que nomes e bio ainda estão em `accounts.accounts` e que a extração não foi concluída. O bloco 05 confirmou os campos no schema e o bloco 11 identificou o cliente de edição de Profile consumindo o serviço Social.

**Trecho:** `No código atual, nomes/bio pessoais e nome/bio comercial ainda estão em accounts.accounts; a extração não está concluída.`

**Impacto:** o ownership desejado está documentado, mas não está integralmente refletido no armazenamento atual nem na camada cliente. É uma correção estrutural necessária antes de declarar Accounts/Profiles alinhados.

### A2-008 — As afirmações históricas de testes no README não foram reproduzidas nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Média

**Evidência:** `docs/api/backend/README.md:5` afirma que suíte, testes de exclusão, replay, typecheck e build passaram. `docs/architecture/database-migration-tracks.md:53–55` relata um replay anterior e também diz que replay automatizado e teste integrado não foram executados “nesta etapa”. O prompt desta auditoria proíbe executar testes/builds/escritas; portanto, o dossiê não valida a execução, data, commit ou cobertura dessas afirmações históricas.

**Trecho:** `A suíte geral ... passaram` no README; no documento de migrations, replay relatado na linha 53 e limites de execução na linha 55.

**Impacto:** conservar como afirmações históricas atribuídas às fontes, não como validação executada neste dossiê. O bloco 14 listará a evidência que falta para uma aprovação de release.

### A2-009 — As três cópias anexadas da arquitetura de dados são idênticas

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa — redundância documental

**Evidência:** comando `sha256sum ../../attached_assets/SeekAlive_Arquitetura_Banco_Dados_por_Dominio_*.md` retornou o mesmo hash para os três arquivos anexados: `90f527659516990830aadf9ae1d61ce23fea4df3c8675dbd3be675f50a960184`.

**Trecho da saída:** os três caminhos terminam com o mesmo SHA-256 acima. Nenhum arquivo foi apagado.

### A2-010 — HTML e ZIP da documentação são artefatos de geração cuja sincronização não foi verificada

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Baixa

**Evidência:** `docs/api/backend/README.md:18` instrui regenerar `index.html` e `Seekalive-backend-documentation.zip` após alterações nas fontes. Esta auditoria não executou `render-docs.mjs`, `generate-contracts.mjs` ou empacotamento, conforme o limite de não executar codegen/build. Não foi feita comparação do conteúdo integral do ZIP com as fontes atuais.

**Trecho:** `Regenere ambos depois de alterar as fontes e mantenha o ZIP sincronizado`.

## Contagem deste apêndice A2

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 1 |
| CONTRADITO | 4 |
| NÃO VERIFICADO | 2 |

**Uso no dossiê:** as contradições documentais alimentam a síntese e as ações recomendadas em `99-sintese-lacunas.md`.


---

# 99 — Síntese, contradições e lacunas

**Data de referência:** 31/10/2026  
**Ambiente auditado:** código do workspace e metadados do banco de desenvolvimento.  
**Resultado geral:** dossiê estático concluído; não significa que a implementação esteja pronta para produção. Nenhum código foi corrigido nesta auditoria.

## Método e limites

O dossiê segue o prompt de auditoria somente leitura. Não houve acesso à produção, leitura de linhas de negócio, valores de segredos, logs de execução ou conteúdo de usuários. Não foram executados testes, builds, typechecks, lint, geração, migrations, `push`, seed ou requisições HTTP de escrita. Os planos SQL foram obtidos somente com `EXPLAIN` (sem `ANALYZE`) e parâmetros fictícios. A única escrita desta atividade foi nos documentos deste dossiê.

Os vereditos distinguem confirmação estrutural de funcionamento real. `CONFIRMADO` não significa que o comportamento tenha sido testado em execução; os limites aparecem dentro do achado. O consolidado não transforma estimativas do planner em contagens de registros.

## Doze hipóteses prioritárias

Cada hipótese do prompt tem um achado detalhado próprio nos blocos temáticos. Esta tabela aponta para esse achado; não cria nem duplica a contagem geral.

| # | Hipótese | Veredito e achado | Conclusão baseada em evidência |
|---:|---|---|---|
| 1 | Concorrência em `auth_challenges.attempts` | **PARCIAL — 03-016** | O caminho de verificação usa transação e `FOR UPDATE`, depois grava `attempts + 1` como valor absoluto; não é incremento SQL atômico e não há teste concorrente. |
| 2 | `trust proxy` e IP usado pelo rate limit | **PARCIAL — 11-005** | Há seleção de IP considerando cadeia de proxies no caminho de desenvolvimento. O salto confiável depende da topologia; não se comprovou o IP observado atrás do proxy efetivo nem resistência a cabeçalho forjado. |
| 3 | Remoção física após 7 + 90 dias | **PARCIAL — 13-004, 13-006, 13-009; FK CONFIRMADA — 05-013** | Há worker e as 22 FKs para `accounts.accounts` são 21 `CASCADE` e uma `SET NULL`, sem `RESTRICT`/`NO ACTION`. A purga, o tratamento dos arquivos e a recuperação do worker não foram exercitados. |
| 4 | Cache de mídia privada | **CONFIRMADO no código — 08-008** | A rota autoriza pelo post, responde `private, no-store`, `nosniff`, `Content-Disposition` e Range. `Vary` não é definido; nenhum cache externo foi testado. |
| 5 | Conta pendente sem TTL | **PARCIAL — 03-017** | O código de verificação expira, mas não foi encontrado job que remova conta pendente nem libere o e-mail/@ após o desafio expirar. |
| 6 | Semântica de audiência `private` | **CONFIRMADO no código / CONTRADITÓRIO nos documentos — 04-001 e A2-003** | Código permite conteúdo privado ao titular e a seguidores aprovados; Círculo continua exigindo seguimento mútuo. Documentos preservam regras divergentes. |
| 7 | Bloqueio após terceiro código incorreto | **CONFIRMADO — 03-010** | A terceira falha bloqueia a conta e revoga sessões/dispositivos. Quem tem a senha válida pode iniciar desafio em instalação nova e causar indisponibilidade ao errar três códigos. |
| 8 | Concorrência do Argon2id | **PARCIAL — 03-018** | Cada hash usa 65.536 KiB; não foi encontrado limite/fila global. Não houve teste de memória ou concorrência. |
| 9 | Falha de e-mail e múltiplas instâncias | **PARCIAL — 09-004 e 11-003** | Envio é síncrono ao provedor sem outbox durável; o rate limit é um mapa local por processo. Reinício pode perder estado de envio/limite; réplicas não compartilham buckets. |
| 10 | Rotas e status do catálogo | **CONTRADITO — 02-003 e 02-004; PARCIAL — 02-012** | OpenAPI ativo, catálogo de endpoints e roteadores não coincidem em métodos, propostas montadas e rotas ausentes. A matriz individual de auth/CSRF/limite/schemas ainda não está consolidada. |
| 11 | Administração/moderação | **CONFIRMADO — 02-011** | Não há router administrativo/moderação nem validação de papel administrativo encontrada no backend atual. |
| 12 | Parser de 256 KiB antes de auth/CSRF | **PARCIAL — 02-006 e 11-006** | Parsers globais JSON/urlencoded rodam antes do router `/api`; o parser maior de artigos também antecede autenticação/CSRF e rate limit local. |

## Contradições entre documentação, decisão registrada, schema e código

1. **Contrato OpenAPI ativo × handlers:** 74 operações no contrato ativo e 76 rotas no servidor, com rotas só no código e divergência de método para posts por conta (`02-003`). O catálogo amplo inclui propostas e não pode ser tratado como handlers (`02-004`).
2. **Estado ATIVA/PROPOSTA × rotas montadas:** há operações marcadas como proposta já registradas no Express, além de caminhos sem linha correspondente (`02-004`). A presença do handler, por si só, também não prova que a persistência exista.
3. **Reviews comerciais:** a API está registrada, mas `profiles.business_profile_reviews` não existe no banco de desenvolvimento; o catálogo de endpoints chama corretamente a persistência de pendente (`02-005`, `05-002`, `04-007`).
4. **Audiência privada:** a implementação permite leitura por seguidor aprovado; documentos também afirmam “somente titular” (`04-001`, `A2-003`).
5. **DTO pessoal × campos aprovados:** o DTO público inclui localização, site e data de entrada, além do conjunto informado para perfil pessoal (`04-003`).
6. **Perfil comercial × informações exigidas:** o DTO e o schema atuais não incluem horário de funcionamento, serviços, comodidades, resumo de avaliações ou link de mapa (`04-005`).
7. **Idade:** código e constraint permitem 18–120, embora a regra aprovada tenha definido somente idade mínima de 18 (`03-002`, `05-007`).
8. **Sessão:** a duração absoluta padrão é sete dias e não renova por atividade, em conflito com a decisão de não limitar a sessão por inatividade (`03-012`).
9. **Instalação reconhecida:** o cookie tem máximo de 400 dias, enquanto a regra aprovada é manter até revogação (`03-013`).
10. **Estrutura de migrations:** arquivos históricos na raiz, trilhas em subpastas e glob de Seek não correspondem integralmente à configuração ativa (`05-005`, `05-006`, `A2-004`).
11. **Contagens e inventário documental:** há contagens antigas incompatíveis com os arquivos atuais e o mapa de módulos omite Feed/Media (`A2-005`, `A2-006`).
12. **Fronteira Accounts/Profiles:** o cadastro coordena campos de conta e inicialização de perfil em uma transação, enquanto documentos registram que a extração de apresentação para Profiles ainda está pendente (`A1-003`, `A2-007`).
13. **Mensagens e notificações:** existem referências/pastas de frontend, mas não há routers e tabelas remotas correspondentes no backend; regras de preservação/anonimização ainda não têm consumidor implementado (`A1-008`, `13-007`).
14. **Ambiente de execução:** o manifest do projeto exige Node `>=22.18.0`, `.replit` declara Node 20 e o runtime observado era Node 22.23.4 (`01-002`).
15. **Documentos de testes:** afirmações históricas do README não foram reproduzidas nesta auditoria; testes atuais não foram executados por escopo (`A2-008`, bloco 14).

## Quinze maiores riscos encontrados

| Ordem | Severidade | Risco e impacto | Evidência |
|---:|---|---|---|
| 1 | Alto | Uma pessoa que conhece a senha pode provocar bloqueio da conta ao errar três códigos de novo dispositivo; todas as sessões e instalações reconhecidas são revogadas. | `03-010`, especialmente `confirmDeviceLogin.ts:76–103` e `deviceVerificationRepository.ts:140–181`. |
| 2 | Alto | Hashes Argon2id sem limite global podem esgotar memória sob concorrência; cada operação usa 65.536 KiB. | `03-018`, `application/passwordHashing.ts:3–12`. |
| 3 | Crítico | Cliente gerado e API real divergem; alguns handlers estão rotulados como proposta e são acessíveis, e há endpoints ausentes/método divergente. | `02-003`, `02-004`, `02-012`. |
| 4 | Alto | Resposta pública de perfil pessoal excede os campos aprovados e expõe localização, site e data de entrada. | `04-003`, `profileViewMapper.ts:18–33`. |
| 5 | Alto | Perfil comercial não apresenta campos funcionais solicitados; rotas de avaliações não têm tabela presente no banco observado. | `04-005`, `04-007`, `05-002`. |
| 6 | Alto | Contas não verificadas não têm purga/TTL identificado; dados de identidade podem permanecer reservados indefinidamente. | `03-017`, `emailVerificationRepository.ts:153–163`; ausência de job encontrada por busca estática. |
| 7 | Alto | Rate limit é por IP e memória local; reinícios zeram os buckets e múltiplas instâncias não compartilham o limite. | `11-002`, `11-003`. |
| 8 | Alto | Cadeia de proxies pode produzir IP compartilhado ou seleção inadequada; segurança depende de topologia não validada. | `11-005`, `trustedClientIp.ts:16–23` e `forwarded-client-ip.ts:6–11`. |
| 9 | Alto | Parse do corpo antecede autenticação/CSRF e rate limit de rota, permitindo custo de parse em chamadas anônimas dentro dos limites configurados. | `02-006`, `11-006`, `app.ts:40–50`. |
| 10 | Alto | O worker de exclusão não se reativa automaticamente se o schema não estiver pronto na inicialização. | `13-009`, `accountDeletionWorker.ts:7–14`. |
| 11 | Médio | Exclusão de arquivos locais ocorre no fluxo da transação SQL; falha posterior pode deixar a operação externa sem reversão e o storage permanente futuro ainda não tem provider de purge. | `13-008`, `accountDeletionPurgeRepository.ts:24–25`. |
| 12 | Médio | Sem outbox, falha ou encerramento após criação do desafio pode deixar o fluxo de e-mail sem entrega durável/retry. | `09-004`; não houve teste real de provedor (`09-007`). |
| 13 | Médio | Sessão expira por idade absoluta e cookie de dispositivo tem prazo de 400 dias, contra regras registradas de sessão sem limite por inatividade e dispositivo até revogação. | `03-012`, `03-013`. |
| 14 | Médio | Busca textual representativa percorre `feed.posts` sequencialmente e ordena; o plano não prova desempenho em volume maior. | `06-006`; saída de `EXPLAIN` sem `ANALYZE`. |
| 15 | Médio | O ledger e o schema não foram comparados migration a migration; objetos existentes não comprovam replay integral nem drift zero. | `05-004`, `05-015`, `05-016`. |

Severidades descrevem o impacto técnico observado no escopo de desenvolvimento, não uma estimativa de probabilidade em produção. A classificação crítica está restrita à divergência entre contrato/cliente e rotas efetivamente servidas (`02-003`); os demais achados não foram elevados sem evidência.

## O que a documentação deveria acrescentar

- Matriz única e versionada de cada rota ativa: método/caminho, autenticação, CSRF, rate limit, papel, schema de entrada, DTO de resposta, status e efeito de persistência.
- Fonte única para operação ativa versus proposta, com verificação automática contra routers e OpenAPI.
- Semântica normativa de `private`, Círculo, bloqueio e visibilidade de perfil/post/mídia/referência, incluindo matriz visitante × perfil × audiência × bloqueio.
- Contrato público de Profiles separado por tipo de conta, com allowlist explícita dos campos permitidos e estado das informações comerciais ausentes.
- Fluxo completo de Reviews: migration aplicada no banco de desenvolvimento, constraints, comportamento das rotas, autorização e resposta.
- Diagrama de transações/locks por operação e testes de concorrência, inclusive para tentativas OTP, sessões simultâneas, seguidores, bloqueios, mídia e exclusão.
- Configuração de implantação: plataforma/tipo, build/run, proxy confiável, CORS/cabeçalhos, variáveis por ambiente, readiness e permissões do papel de runtime. Valores secretos não devem ser documentados.
- Semântica de falha do e-mail, retry/outbox, observabilidade, limites entre instâncias e condições de recuperação operacional.
- Inventário de dados pessoais por coluna, DTO e log; prazo de retenção operacional e prova de expurgo, sem incluir valores pessoais.
- Estado explícito de módulos futuros. Seek, Shop, mensagens, notificações e moderação não podem ser representados como APIs disponíveis apenas porque constam no catálogo de propostas.

## Itens que permanecem NÃO VERIFICADOS e evidência necessária

| Tema | Por que não foi verificado | Evidência necessária numa etapa autorizada |
|---|---|---|
| Implantação e configuração efetiva | Auditoria foi limitada ao desenvolvimento; valores de ambiente e produção foram proibidos. | Revisão de configuração não secreta no ambiente correto; confirmação do tipo de deployment e comandos sem expor valores. |
| Papel real da API no PostgreSQL | A ferramenta de consulta não foi comprovada como a conexão do processo backend. | Identificar o papel efetivo pelo processo de desenvolvimento sem imprimir URL/credencial; conferir privilégios catalogados. |
| Drift completo Drizzle × banco | Catálogo foi lido, mas a comparação objeto a objeto e o replay foram proibidos/não executados. | Comparação read-only de schemas e migrations com relatório por coluna, índice, check, FK e default; depois, teste isolado autorizado. |
| Estado aplicado de cada ledger | Apenas nomes/colunas dos seis ledgers foram consultados; conteúdo não foi lido. | Consulta aprovada apenas a metadados de hash/data dos ledgers de desenvolvimento, sem ler tabelas de usuário. |
| Matriz de segurança de todas as rotas | Rotas e limitadores foram inventariados, mas faltou consolidar auth/CSRF/role/schemas por rota. | Análise estática assistida pelos arquivos de rota e contratos; confirmar com testes seguros de endpoint. |
| Matriz completa de privacidade | Predicados foram revisados, mas nenhum teste de autorização foi executado. | Testes com contas fictícias e banco isolado para público/privado, seguidores, bloqueios, posts, referência e mídia. |
| Concorrência e falhas | Nenhum teste de escrita ou carga foi executado. | Testes isolados com corrida, rollback, crash, retries, deadlock e duas instâncias; medir Argon e rate limit. |
| E-mail real | Nenhuma chamada externa foi feita; segredo não foi lido. | Teste controlado com conta de teste e remetente autorizado, mantendo segredo no fluxo seguro. |
| Storage sob falha/carga | Nenhum arquivo foi enviado ou removido nesta auditoria. | Testes de disco cheio, stream concorrente, Range, autorização e reconciliação de órfãos no armazenamento de desenvolvimento. |
| Respostas visuais autenticadas | Não foram feitas navegação, login ou screenshots interativos. | Testes E2E de UI com fixtures estritamente de desenvolvimento e sem conta real. |
| Métricas/alertas externos | Nenhuma plataforma externa foi consultada. | Inspecionar configuração operacional autorizada e provar alertas de worker, DB, filas e erros. |
| Efeitos de proxy e cabeçalhos externos | Só foi observado o preview de desenvolvimento; infraestrutura externa não foi acessada. | Repetir HEAD/OPTIONS no ambiente de desenvolvimento com topologia/proxy conhecida e depois validar implantação própria. |

## Plano recomendado após aprovação do dossiê

Este plano é recomendação de sequência, não execução nesta auditoria. Nenhum módulo futuro é considerado entregue por estar documentado.

### Gate A — Contratos e evidências coerentes

1. Corrigir o status documental das rotas e alinhar OpenAPI ativo, catálogo e routers.
2. Completar a matriz por rota, incluindo sessão, CSRF, limite, papel, entrada, resposta e status.
3. Atualizar mapa de módulos, ownership Accounts/Profiles e regra `private`; retirar contagens históricas vencidas.
4. Revalidar os arquivos de contrato e o cliente gerado sem alterar regras de negócio silenciosamente.

**Aceitação:** cada rota montada tem status explícito; rota proposta não é servida sem decisão registrada; contrato corresponde ao handler.

### Gate B — Accounts/Auth

1. Resolver os achados de retenção de contas pendentes, sessão absoluta, cookie de instalação e política de lockout, preservando as decisões aprovadas ou discutindo conflito antes de alterar política.
2. Definir proteção de concorrência para Argon2id, OTP, sessões simultâneas e revogação.
3. Confirmar status/ledger de migrations e validar cadastro, verificação, reset, troca, exclusão e restauração com testes isolados.

**Aceitação:** fluxos críticos têm testes de sucesso/falha/corrida; nenhum comportamento aprovado foi substituído por conveniência técnica.

### Gate C — Profiles e Social

1. Ajustar a allowlist de campos públicos pessoais e fechar a apresentação comercial com dados realmente pertencentes a Profiles.
2. Integrar Reviews ao schema aplicado e validar autoria, resposta comercial, exclusão e bloqueios.
3. Comprovar por testes a matriz de perfil privado, Círculo, bloqueio, seguir, mídia e referências.

**Aceitação:** endpoints, DTOs e telas exibem somente campos aprovados; regras de privacidade são consistentes em todas as leituras.

### Gate D — Feed e Media

1. Validar todas as formas de consulta e índices, especialmente busca textual, seguindo, hashtags, perfil e comentários.
2. Cobrir concorrência, cursor, contadores e regras de visibilidade.
3. Tornar limpeza e retenção de arquivos verificáveis e resilientes a falhas, sem deixar filesystem e banco em estados divergentes.

**Aceitação:** testes de acesso e consistência passam com mídias de desenvolvimento; planos SQL das formas reais estão documentados.

### Gate E — Operação e proteção contra abuso

1. Definir proxy confiável e comportamento do IP de forma compatível com a hospedagem escolhida; não usar IP como identidade do dispositivo.
2. Decidir como rate limit funciona com múltiplas instâncias; cobrir também endpoints que não têm limitador local.
3. Completar estratégia durável de e-mail e recuperação do worker; readiness precisa representar dependências críticas.
4. Fechar configuração segura de CORS/cabeçalhos, métricas, alertas e limites de recursos.

**Aceitação:** cenários de falha e abuso são testados no ambiente de desenvolvimento, com valores de segredo protegidos e resultados observáveis.

### Gate F — Integração dos módulos futuros

Só após os gates anteriores, construir a API de Seek como consumidora dos perfis comerciais de Social/Profiles. Mensagens, Notificações e moderação precisam de domínios próprios e regras aprovadas antes de serem ligados. Shop permanece fora do escopo atual. A arquitetura lógica dos schemas por domínio não equivale a provisionar bancos físicos independentes.

**Aceitação:** nenhum módulo futuro é tratado como ativo até ter schema, contratos, autorização, integrações, testes e documentação correspondentes.

## Contagem consolidada

Os rascunhos supersedidos listados no índice não entram na contagem. Os apêndices A1 e A2 entram uma vez cada. Esta síntese referencia achados anteriores e não cria IDs adicionais.

| Veredito | Achados |
|---|---:|
| CONFIRMADO | 72 |
| PARCIAL | 60 |
| CONTRADITO | 15 |
| NÃO VERIFICADO | 16 |
| **Total** | **163** |

**Leitura do total:** achados confirmados descrevem evidência estrutural/comportamental estática; não equivalem a teste funcional executado. Achados não verificados são mantidos como tal, sem inferência.


---

