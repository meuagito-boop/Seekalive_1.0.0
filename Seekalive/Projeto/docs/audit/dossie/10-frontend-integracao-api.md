# 10 — Front-end e integração com API

## Escopo

Mapeamento estático da seleção entre sessão real e demonstração, chamadas do cliente para Auth/Onboarding/Social/Profiles/Mídia e módulos cuja interface ainda usa fixtures ou armazenamento do navegador. Não foi feito login nem fluxo E2E.

## Achados

### 10-001 — O aplicativo consulta a sessão real ao iniciar e não converte falha em logout

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `front/src/modules/app/state/AppContext.tsx:64–85` chama `resolveAuthSession(getCurrentSession)`; se a API não estiver disponível, marca `sessionCheckUnavailable`. `front/src/App.tsx:23–47` apresenta uma tela de erro e permite tentar novamente, em vez de abrir uma sessão demonstrativa. O cliente de sessão usa o endpoint `/auth/session` (`auth/services/sessionApi.ts:30–34`).

**Trecho:** `resolveAuthSession(getCurrentSession).then(...)`; estado indisponível vira tela com a mensagem “Não vamos tratar uma falha de conexão como se você tivesse saído da conta.”

### 10-002 — Login, cadastro, sessão e onboarding usam o backend com contratos de resposta

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `auth/services/loginApi.ts:16–42` chama login e confirmação de novo dispositivo; `registrationApi.ts:5–11` envia cadastro; `onboarding/services/onboardingApi.ts:3–11` envia interesses e opção de pular. `app/api/httpClient.ts:75–104` usa cookies, obtém CSRF antes de escrita e valida os status/respostas declarados quando fornecidos.

**Trecho:** cadastro usa `postJson("/auth/register", payload, { 202: RegisterAccountResponse })`; `postJson` obtém CSRF e envia `credentials: "include"`.

### 10-003 — O cliente alterna de forma explícita entre preview local e sessão Social real

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `app/state/SocialApplicationContext.tsx:61–69` define sessão remota quando existe conta autenticada e não é preview. `social/application/postActions.ts:78–87` usa `restContentAdapter` para sessão remota e `contentService` demonstrativo para preview. O feed remoto carrega e pagina a API (`social/screens/Feed.tsx:224–266,268–305`).

**Trecho:** `const isRemoteSocialSession = Boolean(currentUser && !isDevelopmentPreview);`; `isRemoteSocialSession ? await restContentAdapter.createPost(input) : await contentService.createPost(input)`.

### 10-004 — Perfis, relações e parte das configurações usam o cliente gerado a partir do contrato

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `social/services/socialGraphApi.ts:1–35` importa operações e tipos de `@workspace/api-client-react`; o estado remoto chama `getProfileByUsername` e converte resposta em perfil e publicações (`app/state/SocialApplicationContext.tsx:207–225`). A tela comercial usa serviço próprio de avaliações (`profile/commercial-profile/services/businessProfileReviewApi.ts:29–56`), e Account/Privacy chamam a API do grafo social (`settings/screens/Account.tsx:90,182,289`, `settings/screens/Privacy.tsx:48,78,101`).

**Trecho:** `getProfileByUsername(parsedUsername.data)` alimenta `profileResponseToUser(profile)`; o cliente é importado de `@workspace/api-client-react`.

### 10-005 — O fluxo autenticado de publicação envia arquivos e IDs de ativos ao servidor

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `social/services/restContentService.ts:20–50` envia arquivos via `uploadSocialMedia` e cria a publicação com os IDs resultantes. A tela de publicação seleciona esse adaptador conforme o modo remoto (`social/application/postActions.ts:78–87`). O detalhamento e os limites estão no bloco 07.

**Trecho:** `uploadedMedia.push(await uploadSocialMedia(file, types[index]))`; a publicação recebe `mediaAssetIds: uploadedMedia.map((media) => media.id)`.

### 10-006 — Dados de demonstração são fixtures interativas de desenvolvimento, não imagens isoladas

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** o botão de preview chama `startDevelopmentPreview` (`auth/screens/Login.tsx:246–248`), e o método só continua quando `import.meta.env.DEV` é verdadeiro (`app/state/AppContext.tsx:112–120`). A hidratação Social exige ao mesmo tempo build de desenvolvimento e modo preview (`socialApplicationState.ts:42–46`, `SocialApplicationContext.tsx:168–196`). `data/demo/previewFixtures.ts` agrega usuários, publicações, mensagens, notificações e dados demonstrativos de Seek/Shop. Portanto, o preview contém registros fictícios interativos no estado do cliente; não é apenas uma imagem. Algumas preferências também usam armazenamento do navegador. A condição de produção bloqueia esse caminho no código.

**Trecho:** `if (!import.meta.env.DEV) return;` antes de importar `previewFixtures`; a hidratação exige `isDevelopmentBuild && isDevelopmentPreview`.

### 10-007 — Seek ainda não consome API de descoberta do backend

**Veredito:** PARCIAL  
**Prioridade:** Prevista para a etapa Seek

**Evidência:** a busca estática no módulo `front/src/modules/seek` encontrou leitura do catálogo de cidades local (`seek/services/seekLocationService.ts:40`) e dados demonstrativos habilitados somente em desenvolvimento (`seek/hooks/useSeekDiscovery.ts:47–63`), mas nenhuma chamada `/api/v1/seek` ou adapter REST de descoberta.

**Comando e resultado:** `rg -n 'apiRequest|getJson|postJson|fetch\\(|/api/v1' Aplicativo/front/src/modules/seek --glob '*.{ts,tsx}'` encontrou apenas o `fetch` do catálogo local em `seekLocationService.ts:40`; nenhuma rota Seek.

**Impacto:** a tela pode demonstrar a experiência e filtrar exemplos locais, mas ainda não descobre perfis comerciais reais da rede Social. Isso é uma fronteira de etapa, não um defeito da API Social já construída.

### 10-008 — O cliente combina dois transportes HTTP e precisa manter contratos alinhados

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** Auth usa `app/api/httpClient.ts`; Social usa `social/services/socialHttp.ts` e também operações Orval em `socialGraphApi.ts`. O contrato OpenAPI ativo e as diferenças verificadas entre métodos/rotas estão no bloco 02.

**Trecho:** `socialGraphApi.ts` importa operações de `@workspace/api-client-react`; `restContracts.ts` usa `apiRequest(...)`. O alinhamento de métodos e paths permanece sujeito às divergências enumeradas em 02-003/02-004.

**Impacto:** a existência dos dois adapters não é por si só incorreta; mudanças de caminho, CSRF, erro e validação precisam ser atualizadas nos consumidores correspondentes. Não foi executado teste de contrato cliente-servidor.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 6 |
| PARCIAL | 2 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 0 |

**Próximo bloco:** inventário dos domínios que ainda não têm backend e verificação de limites de responsabilidade.
