# Plano 1 — Verdade única para rotas, contrato e documentação

**Data:** 2026-10-31  
**Status:** aguardando aprovação explícita para implementação. A solicitação de aprovação foi cancelada; isso não autoriza executar o plano.

Este documento preserva no mesmo arquivo o prompt original do usuário e o plano apresentado pelo agente.

## Prompt original do usuário

> Prompt 1 — Verdade única (rotas, contrato, docs)  
> OBJETIVO: uma única fonte de verdade para rotas, contrato e documentação.  
> REGRAS: plano primeiro e espere meu OK; sem push/migrate/DDL, produção ou segredos; não mude regra aprovada (pare e pergunte); relatório final: mudou / evidência / não verificado.  
>
> 1. Script que lê as rotas Express realmente montadas e gera docs/api/backend/routes.generated.md (método, caminho, auth, CSRF, rate limit, schema de entrada, DTO de saída).  
> 2. Teste que FALHA se houver rota montada fora de shared/api-spec/openapi.yaml, ou o inverso. Corrija: faltam no contrato GET /readyz, GET /v1/accounts/availability e POST /v1/onboarding/interests; /v1/social/accounts/{accountId}/posts é GET, não POST. Rode codegen e typecheck.  
> 3. Regenere endpoints.md a partir do inventário. As 11 rotas montadas marcadas PROPOSTA (feed, comentários, curtidas, repost, DELETE de post e de comentário) passam a ATIVA. Corrija caminhos errados (mídia = /v1/social/media; salvos = /bookmark). Mova o catálogo de 146 operações para docs/roadmap/ com outro nome.  
> 4. Remova trechos obsoletos: "recuperação de senha não conectada", "schema Drizzle vazio", "restSocialApi não conectado", contagens de tabelas (12 a 22 conforme o arquivo), "FKs restritivas" (o banco tem 21 CASCADE). Estado do banco deve apontar para uma consulta de catálogo, não para texto fixo.  
> 5. Onde há contradição, registre a regra vigente: audiência private (titular + seguidores aprovados de perfil privado), campos de apresentação (Profiles), avaliações (Profiles, não Seek). Se não souber qual é a aprovada, pergunte.  
>
> ACEITE: teste rotas×contrato passa; nenhum documento contradiz o código.

## Plano apresentado pelo agente

Mapeei os pontos principais sem alterar arquivos. Há uma diferença de prefixo importante: o Express monta a API em `/api`, enquanto o OpenAPI usa caminhos relativos; assim, `/readyz` no contrato corresponde a `/api/readyz` em runtime. `endpoints.md` já lista `/readyz`, disponibilidade e onboarding, mas o `shared/api-spec/openapi.yaml` não contém esses três caminhos. A especificação compartilhada já registra `/v1/social/accounts/{accountId}/posts` como `GET`; vou verificar e alinhar também qualquer catálogo ou documento que ainda indique `POST`.

O gerador existente produz um catálogo estático de 146 operações e também escreve `endpoints.md`, o que conflita com a nova fonte de rotas montadas. O código já usa `/v1/social/media` e `/bookmark`, enquanto o catálogo legado ainda registra `/v1/media` e `/saved`.

### Etapas

1. **Fechar a fonte e a normalização**
   - Tratar o grafo final de routers Express como evidência do que está realmente montado.
   - Tratar `shared/api-spec/openapi.yaml` como contrato público de schemas, segurança e respostas.
   - Comparar caminhos em formato relativo à API, removendo apenas o prefixo `/api` do runtime.
   - Tornar explícitos nos registros de rota os metadados que não são inferíveis com segurança: autenticação, CSRF, rate limit, schema de entrada e DTO de saída. Não deduzir informação ausente pelo nome da rota.

2. **Gerar o inventário e proteger a paridade**
   - Criar um gerador que percorra as rotas realmente montadas e produza `docs/api/backend/routes.generated.md`.
   - Criar teste bidirecional método+caminho: falha se uma rota montada não estiver no OpenAPI ou se o OpenAPI declarar uma rota não montada.
   - Incluir a conferência dos metadados da rota; ausência de informação necessária também deve falhar, não ser mascarada.

3. **Corrigir contrato e geração**
   - Adicionar ao OpenAPI `GET /readyz`, `GET /v1/accounts/availability` e `POST /v1/onboarding/interests`, com schemas e respostas baseados nos handlers atuais.
   - Conferir a operação de posts por conta como `GET` em todas as representações.
   - Ativar em `endpoints.md` somente as 11 operações marcadas como propostas que forem confirmadas no grafo montado.
   - Corrigir mídia para `/v1/social/media` e salvos para `/bookmark`.
   - Mover o catálogo legado de 146 operações para `docs/roadmap/api-operation-catalog.json` e ajustar seu gerador para não sobrescrever a documentação ativa.
   - Rodar o codegen do contrato e o typecheck.

4. **Eliminar contradições documentais**
   - Localizar as afirmações obsoletas solicitadas e atualizar os documentos-fonte.
   - Substituir contagens fixas de tabelas por referência a uma consulta somente leitura de catálogo; corrigir a afirmação sobre FKs usando essa consulta, sem transformar contagens temporárias em fatos permanentes.
   - Registrar exatamente as regras aprovadas: `private` permite leitura ao titular e, em perfil privado, seguidores aprovados; campos de apresentação pertencem a Profiles; avaliações pertencem a Profiles, não Seek.
   - Regenerar `Seekalive-backend-documentation.md` e `index.html` pelo renderer existente para não deixar cópias antigas.

5. **Validar e relatar**
   - Executar o teste rotas×contrato, codegen, typecheck e verificações de texto/documentação.
   - Não executar `push`, `migrate`, DDL, acessar produção ou expor segredos.
   - Entregar relatório final separado em **mudou**, **evidência** e **não verificado**. Se surgir conflito com regra aprovada, parar e consultar antes de alterar.

## Evidências consultadas antes do plano

- O Express monta o router principal em `/api`; o contrato OpenAPI representa os caminhos sem esse prefixo.
- A aplicação monta `/healthz` e `/readyz`; `shared/api-spec/openapi.yaml` já contém `/healthz`, mas não `/readyz`.
- A aplicação monta a disponibilidade de conta e o envio de interesses; os dois caminhos constam em `endpoints.md`, mas não no OpenAPI compartilhado.
- `shared/api-spec/openapi.yaml` já declara `GET /v1/social/accounts/{accountId}/posts`.
- O contrato compartilhado já usa `/v1/social/media` e `/v1/social/posts/{postId}/bookmark`; o catálogo legado e `endpoints.md` ainda exibem caminhos antigos de mídia e salvos.
- `docs/api/backend/generate-contracts.mjs` gera o catálogo de 146 operações e também escreve `endpoints.md` e `openapi.json`.
- Os documentos-fonte e a documentação consolidada contêm afirmações antigas sobre tabelas e estado do Drizzle; a consolidação é gerada por `docs/api/backend/render-docs.mjs`.
- Nesta etapa foram feitas apenas leituras e buscas. Nenhum arquivo de implementação, contrato ou documentação ativa foi modificado.

## Critérios de aceite propostos

- O teste bidirecional comprova correspondência exata entre método+caminho do grafo Express montado e `shared/api-spec/openapi.yaml`.
- `routes.generated.md` e `endpoints.md` são gerados sem inventário manual duplicado e refletem os metadados de rota.
- O codegen e o typecheck terminam sem erros.
- Os documentos ativos não contradizem o código ou as regras aprovadas.
- Nenhum `push`, `migrate`, DDL, operação em produção ou acesso a segredo é realizado.
