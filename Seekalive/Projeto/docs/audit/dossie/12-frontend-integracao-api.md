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
