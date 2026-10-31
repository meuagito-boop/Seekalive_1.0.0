# Plano 1 — Verdade única para rotas, contrato e documentação (revisão consolidada)

**Data:** 2026-10-31  
**Revisão:** v2, incorporando o aditivo técnico do proprietário.
**Status:** execução autorizada por instrução posterior do proprietário. Os critérios documentais e de paridade foram concluídos e revistos; as limitações de validação de integração estão registradas como pendências explícitas, sem alegar comportamento não comprovado.

Este documento preserva no mesmo arquivo o prompt original do usuário e o plano apresentado pelo agente.

## Aditivo técnico recebido

Fonte original: [aditivo técnico anexado pelo proprietário](../../../../attached_assets/aditivo-tecnico-plano-1-seekalive_1793465004885.md). O arquivo anexado permanece sem alteração. Este plano consolida suas ordens: verificar comportamento, contratos, middlewares, regras de negócio, testes e documentação; distinguir o que está declarado do que foi comprovado; evitar reescrita de roteamento e dependências redundantes; não executar `push`, `migrate`, DDL, produção ou operações com segredos; e parar para consultar se surgir conflito ou decisão arquitetural nova.

O aditivo também altera um ponto do plano inicial: **uma rota montada não basta para classificá-la como ATIVA**. As 11 operações devem ser avaliadas uma a uma; ATIVA só poderá indicar funcionalidade validada no ambiente explicitamente indicado.

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

## Plano inicial apresentado pelo agente — v1, substituído pela revisão consolidada abaixo

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

---

## Diagnóstico complementar após o aditivo

As constatações abaixo vêm de leitura e busca nos arquivos. Elas **não** provam comportamento de execução; itens não comprovados estão explicitamente separados.

### Evidências de implementação e ferramentas encontradas

| Área | Evidência observada | Limite da evidência |
|---|---|---|
| Montagem Express | `Aplicativo/back/src/app.ts` monta o router em `/api`; `Aplicativo/back/src/modules/index.ts` agrega health, auth, onboarding, Profiles, relações Social, mídia e Feed. O backend usa Express 5.3.0. | A leitura do código não comprova que um extrator futuro percorra corretamente todos os routers e middlewares em runtime. |
| Prefixos | A API usa `/api` no runtime; OpenAPI e caminhos do inventário são relativos a esse prefixo. `GET /readyz` corresponde ao runtime `/api/readyz`. | O teste de paridade ainda não existe/foi executado. |
| Contrato e codegen | `shared/api-spec/openapi.yaml` é entrada do Orval. A configuração gera React Query em `shared/api-client-react/src/generated` e Zod/types em `shared/contracts/src/generated`. O script `codegen` também executa `typecheck:libs`. | Não foi executado codegen nesta revisão nem validada a equivalência de cada handler com cada schema gerado. |
| Rotas do escopo Feed | O código monta 11 operações hoje descritas como PROPOSTA: GET feed; GET/POST comentários; DELETE comentário; PUT/DELETE curtida em publicação; POST/DELETE repost; PUT/DELETE curtida em comentário; DELETE publicação. | A montagem confirma existência da rota, não a conclusão funcional, autorização correta ou persistência validada. |
| Middlewares Feed | As declarações encontradas aplicam limitadores por operação; as escritas usam `requireCsrf`; as operações consultam o ator por `requiredActorId`. `requireCsrf` verifica origem e token. | Não foram executados testes positivos e negativos de autenticação, autorização, CSRF, rate limit e ordem para cada operação. |
| Limite de requisições | `createAuthRateLimit` guarda contadores em um `Map` local ao processo e usa nome do limitador e IP confiável como chave. | Não há evidência de coordenação entre processos/instâncias. O plano não alterará esse desenho nem o descreverá como rate limit distribuído; seu alcance será registrado. |
| Testes existentes | A stack usa `node:test`, `tsx` e `fetch` nativo. `scripts/src/api-runtime.test.mjs` usa servidor local efêmero e cobre health/readiness, 404, rejeição de sessão ausente, rejeição CSRF do onboarding e limites de corpo. Existem testes de Feed para visibilidade, listagem, políticas e injeção de dependências. | Esses testes não demonstram, por si só, os 11 fluxos HTTP autenticados. |
| Teste HTTP completo existente | `Aplicativo/back/test/api-isolated-db.test.mjs` contém cenários HTTP de Feed e outras áreas, inclusive comentários, curtidas, reposts, permissões e exclusões. | `setupIsolatedDatabaseFixture` cria schema, executa `pnpm --filter @workspace/db run push` e remove o schema com `DROP SCHEMA ... CASCADE`. O teste não será executado sob a proibição explícita de push e DDL. |
| Dependências de teste | Não foram encontrados `supertest` ou Schemathesis nos manifests pesquisados; há `node:test`, `tsx` e `fetch` nativo. | Nenhuma dependência nova está aprovada. Primeiro será avaliado se a stack existente atende; eventual dependência exige justificativa e nova aprovação. |
| Documentação | `generate-contracts.mjs` mantém um catálogo estático de 146 operações e escreve `openapi.json` e `endpoints.md`. `render-docs.mjs` lê nove documentos Markdown e gera `index.html` e `Seekalive-backend-documentation.md`. | Não foi encontrada, na busca feita, uma verificação automatizada de atualização/determinismo dos artefatos. A ausência precisa ser confirmada na etapa de diagnóstico. |
| Banco e catálogo | `docs/audit/dossie/05-banco-migrations-integridade.md` contém consulta de `information_schema.tables`; também existem probes de auditoria em `docs/audit/dossie2/experimentos/`. | Não foi localizada em `docs/api/backend` uma consulta reutilizável que identifique ambiente e liste, em conjunto, tabelas, views, índices, constraints, FKs e ações referenciais. Nenhum catálogo atual foi consultado nesta revisão. |

### Não verificado nesta revisão

- Enumeração completa e automatizada de todas as rotas realmente montadas, incluindo routers aninhados e middlewares herdados.
- Conformidade total de parâmetros, schemas, códigos HTTP, respostas, content types e segurança entre handlers e OpenAPI.
- Comportamento HTTP positivo de todas as 11 operações com sessão válida e autorização por recurso.
- Rate limit por operação em execução e seu comportamento sob múltiplos processos.
- Persistência atual e cascatas do banco de desenvolvimento.
- Geração determinística e detecção automatizada de documentação desatualizada.
- Execução de testes, codegen e typecheck durante esta revisão.

## Plano consolidado revisado — v2

### Princípio de autoridade

Não existe um arquivo único que prove todos os aspectos. A autoridade será definida por responsabilidade:

- **Grafo Express montado:** quais métodos, caminhos, routers e middlewares estão realmente registrados.
- **`shared/api-spec/openapi.yaml`:** contrato público esperado, incluindo parâmetros, entrada, respostas, erros e segurança declarada.
- **Schemas e validadores usados pelos handlers:** comportamento de validação efetivamente aplicado.
- **Testes HTTP/funcionais/de segurança:** comportamento observável comprovado.
- **Regras aprovadas pelo proprietário:** decisões de produto que não podem ser reinterpretadas.
- **Documentação gerada:** representação derivada das fontes acima, nunca evidência independente.

### Etapa 0 — diagnóstico complementar somente leitura

**Sem alteração de código, contrato, banco ou documentos ativos.**

1. Completar a matriz das 11 operações, registrando método, caminho relativo, router, handler, dependências, validação, status HTTP, DTO, erros e testes já existentes.
2. Mapear a cadeia real por operação: middleware global, router, rota, rate limit, CSRF, autenticação, autorização e verificação de propriedade.
3. Inspecionar a estrutura de runtime do Express 5.3.0 para saber se um inventário consegue enumerar routers aninhados sem depender de APIs privadas instáveis.
4. Examinar o uso dos clientes gerados no frontend antes de qualquer mudança no OpenAPI, para detectar impacto de codegen.
5. Confirmar comandos de teste sem efeitos colaterais. Não executar `api-isolated-db.test.mjs`: o fixture executa `push` e DDL.

**Entrega/gate:** matriz “existe e atende / parcial / não verificado”, lista exata das 11 operações, arquivos afetados e riscos. Se o runtime Express não puder ser inspecionado de modo confiável sem reescrita ou novo mecanismo, parar e apresentar a alternativa antes de implementá-la.

### Etapa 1 — matriz de conformidade por operação

Para cada rota da lista das 11, registrar:

1. método, caminho real e normalização do prefixo `/api`;
2. parâmetros de path, query e headers;
3. corpo, obrigatoriedade, tipos, formatos e restrições;
4. status de sucesso e erro, schemas, DTO e content type;
5. autenticação, autorização, propriedade do recurso e CSRF quando aplicáveis;
6. limitador, ordem observada e resposta de bloqueio;
7. regra de negócio e persistência esperadas;
8. teste disponível, evidência executada e lacuna restante;
9. classificação e ambiente.

Manter a taxonomia existente sempre que possível. Se for necessário tornar os estados inequívocos, usar a menor extensão que diferencie: **PLANEJADA**, **REGISTRADA** (rota montada sem comprovação funcional), **IMPLEMENTADA** (handler/dependências presentes, validação insuficiente), **VALIDADA** (contrato, funcionalidade e segurança aplicável testados) e **ATIVA** (validada e disponível no ambiente indicado). Não duplicar estados já equivalentes. `ATIVA` nunca significará produção se só houver evidência de desenvolvimento.

**Gate:** revisar a matriz antes das alterações. As 11 rotas não serão marcadas ATIVA apenas por estarem montadas; cada uma precisa de evidências próprias. O pedido original de ativação é atendido somente onde os critérios individuais forem aprovados.

### Etapa 2 — inventário de runtime e paridade de rotas

1. Implementar primeiro um teste/protótipo isolado que importe a aplicação sem iniciar listener externo nem consultar banco e enumere as rotas do grafo Express efetivamente montado.
2. Usar caminhos relativos ao prefixo `/api`; registrar, para diagnóstico, o caminho de runtime e o caminho de contrato.
3. Preferir mecanismos já disponíveis. Não reescrever routers nem introduzir registro paralelo só para gerar documentação.
4. Se a enumeração depender de estrutura interna instável do Express, não declarar completude: parar e pedir aprovação para a alternativa mínima.
5. Gerar `docs/api/backend/routes.generated.md` a partir do grafo confirmado, correlacionado ao contrato e aos testes. Distinguir segurança declarada, middleware presente, comportamento testado e itens não verificados.
6. O teste de paridade deve comparar método+caminho em ambas as direções. Divergências de schema não serão tratadas como aprovadas por esse teste básico.

### Etapa 3 — conformidade integral OpenAPI/implementação

1. Adicionar ao OpenAPI os caminhos ausentes confirmados no código: `GET /readyz`, `GET /v1/accounts/availability` e `POST /v1/onboarding/interests`.
2. Preservar `GET /v1/social/accounts/{accountId}/posts`; procurar `POST` obsoleto em todos os catálogos e remover/corrigir somente as projeções erradas.
3. Comparar por operação parâmetros de path/query/headers, request body, campos obrigatórios, tipos, formatos, restrições, respostas e códigos HTTP, content types, erros e segurança.
4. Reutilizar schemas/validadores atuais e os schemas Zod gerados por Orval quando forem realmente usados pelo handler. Não duplicar regras para satisfazer o teste.
5. Validar respostas observadas com os schemas de contrato existentes; se não houver schema reutilizável ou a equivalência não puder ser comprovada, registrar a lacuna e não inventar DTOs.
6. Antes de remover operações não montadas do OpenAPI ativo, identificar chamadas no frontend e preservar operações futuras no catálogo de roadmap para evitar remoção silenciosa de tipos/clientes usados.
7. Rodar `pnpm --filter @workspace/api-spec run codegen` e `pnpm run typecheck`; revisar os artefatos gerados.

### Etapa 4 — segurança observável e ordem de middlewares

Para cada operação aplicável, testar comportamento, não só nomes de funções:

- Sem sessão e com credencial inválida: resposta não autenticada correta.
- Sessão autenticada sem autorização: negação, inclusive tentativa de acessar recurso de outra conta (BOLA).
- CSRF ausente/inválido e válido para escritas; same-origin e origem rejeitada.
- Rate limit abaixo e acima do limite, incluindo `429`/`Retry-After` e isolamento por chave.
- Ordem entre middlewares globais, mount de router, limitador, CSRF, autenticação, validação e handler.
- Falhas sem vazamento de internals.

Usar os mecanismos existentes (`node:test`, `fetch`, test doubles). Não adicionar Supertest/Schemathesis sem comprovar a necessidade e obter aprovação. A limitação do rate limiter atual (estado em memória por processo) deverá constar no relatório; não será apresentada como proteção distribuída.

### Etapa 5 — validação funcional individual das 11 operações

Lista a confirmar pela matriz:

1. `GET /v1/social/feed`
2. `GET /v1/social/posts/{postId}/comments`
3. `POST /v1/social/posts/{postId}/comments`
4. `DELETE /v1/social/comments/{commentId}`
5. `PUT /v1/social/posts/{postId}/like`
6. `DELETE /v1/social/posts/{postId}/like`
7. `POST /v1/social/posts/{postId}/repost`
8. `DELETE /v1/social/posts/{postId}/repost`
9. `PUT /v1/social/comments/{commentId}/like`
10. `DELETE /v1/social/comments/{commentId}/like`
11. `DELETE /v1/social/posts/{postId}`

Para cada uma, comprovar entrada válida/inválida, sucesso e DTO, erros, conta sem permissão, recurso inexistente, idempotência/duplicidade quando aplicável e persistência. Reaproveitar a cobertura existente; não duplicar testes que já atendam.

**Limite obrigatório:** o teste HTTP integrado existente cobre vários desses casos, mas seu setup cria schema, executa `db push`, grava dados e remove o schema com `DROP SCHEMA ... CASCADE`. Isso viola a proibição atual de push/DDL. Não será executado nem contornado. Testes sem persistência poderão usar doubles somente para o que realmente comprovarem. Persistência e sucessos autenticados que dependam desse banco permanecerão **não verificados** até existir ambiente de teste previamente provisionado sem DDL ou autorização explícita separada para esse setup. Não declarar ATIVA para uma rota cuja validação obrigatória permaneça bloqueada.

### Etapa 6 — regressão das regras aprovadas

1. Privacidade: titular acessa; seguidores aprovados de perfil privado acessam o conteúdo permitido; não aprovados e visitantes não contornam a restrição; conhecer o ID não concede acesso.
2. Apresentação e propriedade: campos de apresentação permanecem em Profiles, sem fonte paralela contraditória.
3. Avaliações: permanecem em Profiles, não Seek.
4. Inspecionar e reaproveitar testes existentes (`feed-visibility`, `profile-visibility`, testes de reviews); complementar somente lacunas concretas.
5. Se o comportamento do código conflitar com regra aprovada, corrigir somente conforme a regra já definida. Se houver ambiguidade, parar e consultar; não criar política nova.

### Etapa 7 — documentação como código

1. Manter `shared/api-spec/openapi.yaml` como contrato público; runtime, validadores e testes comprovam partes diferentes e não serão reduzidos a uma única fonte artificial.
2. Gerar `routes.generated.md` e `endpoints.md` do inventário e do OpenAPI, sem catálogo estático duplicado de rotas ativas.
3. Classificar individualmente as 11 operações segundo evidência, ambiente e taxonomia aprovada.
4. Corrigir documentação de mídia (`/v1/social/media`) e salvos (`/bookmark`).
5. Mover o catálogo de 146 operações para `docs/roadmap/seekalive-operation-catalog.json` e `.md`; ajustar minimamente `generate-contracts.mjs` para que gere somente o artefato de roadmap e nunca sobrescreva docs ativas.
6. Remover afirmações obsoletas sobre recuperação, Drizzle, `restSocialApi`, contagens fixas de tabelas e FKs restritivas, sem apagar evidência histórica que continue claramente identificada como histórica.
7. Documentar fontes e arquivos gerados; criar/usar um único comando de geração e uma verificação de saída desatualizada. Reutilizar `render-docs.mjs` para `index.html` e `Seekalive-backend-documentation.md`; não criar renderer concorrente.
8. Comprovar determinismo executando geração duas vezes e comparando saídas. Testar a detecção de stale docs em cópia/fixture temporária, não corrompendo arquivos de trabalho.

### Etapa 8 — catálogo de banco somente leitura

1. Reutilizar consulta existente se atender; caso contrário, propor um arquivo SQL somente leitura em `docs/api/backend/queries/`.
2. Incluir tabelas, views, índices, constraints, FKs e ações referenciais (`CASCADE`, `RESTRICT`, etc.).
3. Informar o ambiente selecionado pelo operador e uma identificação não sensível da instância/banco; nunca registrar URL ou credenciais.
4. Não executar DDL, push, migration, nem consultar linhas de negócio. Não manter contagens temporárias fixas como descrição permanente.
5. Confirmar o dado atual de CASCADE com o catálogo de desenvolvimento, se autorizado e disponível; se a evidência não estiver disponível, declarar não verificado, não afirmar número.

### Etapa 9 — revisão final e relatório

Executar apenas verificações cujo efeito foi inspecionado:

- Teste de paridade método+caminho nos dois sentidos.
- Testes de conformidade de parâmetros, entrada, respostas e segurança que não escrevam em banco.
- Testes HTTP/runtime e regressões sem DDL.
- `pnpm --filter @workspace/api-spec run codegen`.
- `pnpm run typecheck`.
- Suíte de testes sem efeitos de banco, após confirmar seus efeitos; não incluir `test:api-isolated-db`.
- Geração de documentos e teste de determinismo/staleness.
- Consulta de catálogo somente leitura em desenvolvimento, sem dados de negócio, se disponível.

Executar uma segunda revisão independente dos critérios e artefatos antes de qualquer fechamento. Entregar:

**A. Mudou** — cada arquivo alterado/criado/removido e finalidade.
**B. Evidência** — comandos, resultados, testes aprovados/reprovados e comportamento observado.
**C. Não verificado** — item, motivo e próximo passo, sem alegar conclusão.
**D. Riscos e pendências** — impacto, decisão necessária e condição de encerramento.
**E. Restrições respeitadas** — declarar expressamente se houve push, migrate, DDL, produção, acesso/exposição de segredos ou mudança de regra.

## Arquivos e módulos afetados

A implementação foi limitada à instrumentação de inventário, contratos gerados e documentação. Nenhuma regra de negócio, endpoint executável ou persistência foi adicionada.

- Runtime e rotas: `Aplicativo/back/src/app.ts`, `Aplicativo/back/src/modules/index.ts`, `Aplicativo/back/src/modules/feed/composition/router.ts` e arquivos de rotas Feed; health, onboarding, Profiles e segurança somente quando a auditoria de contrato exigir.
- Contrato e geração: `shared/api-spec/openapi.yaml`, `shared/api-spec/orval.config.ts`, código gerado em `shared/contracts/src/generated` e `shared/api-client-react/src/generated`.
- Testes: `scripts/src/api-runtime.test.mjs`, testes existentes em `Aplicativo/back/test` e, se necessário, testes sem banco com `node:test` e `fetch`. Não executar o setup isolado que chama `push`.
- Documentação: `docs/api/backend/generate-contracts.mjs`, `render-docs.mjs`, documentos-fonte envolvidos, `endpoints.md`, `routes.generated.md`, `index.html`, `Seekalive-backend-documentation.md` e o catálogo movido para `docs/roadmap/`.
- Banco: consulta somente leitura proposta em `docs/api/backend/queries/` apenas se a consulta existente não atender; sem alteração no schema.

## Decisões, riscos e pontos de parada

1. **Sem reescrita de routers ou registro paralelo por conveniência.** Se a inspeção real do Express exigir uma mudança arquitetural ou uma dependência, interromper e pedir aprovação específica.
2. **Dependência adicionada com justificativa:** `yaml@2.9.1` como dependência de desenvolvimento de `@workspace/scripts`, porque o inventário precisa interpretar o OpenAPI YAML com parser real. Licença ISC verificada; `pnpm audit --prod=false` não encontrou vulnerabilidades conhecidas. Orval e Zod não foram atualizados.
3. **A suíte integrada de Feed existe, mas está bloqueada pelas restrições atuais:** ela executa `push` e DDL em schema temporário. Não será rodada. Isso impede alegar persistência completa sem um ambiente previamente provisionado ou autorização futura.
4. **Rate limit atual é local ao processo.** A validação pode comprovar o comportamento na instância de desenvolvimento, não coordenação entre instâncias.
5. **Código declarado não é comportamento comprovado.** O relatório separará fonte, registro runtime, middleware aplicado e teste observado.
6. **Nenhuma operação com produção, segredo, DDL, migration ou push.** Qualquer desvio de escopo ou regra aprovada exige interrupção e consulta.

**Autorização:** implementação iniciada após aprovação explícita do usuário.

## Registro de execução — 31/10/2026

### Mudou

- `scripts/src/api-route-inventory.mjs`: inventaria os registros Express através das APIs públicas de montagem, normaliza os caminhos e compara método/caminho com OpenAPI; extrai CSRF e metadados de rate limit.
- `scripts/src/api-route-contract.test.mjs`, `scripts/src/generate-api-route-docs.mjs` e `scripts/package.json`: teste de paridade nos dois sentidos, rejeição de divergências e modo `--check` para detectar documentação de rotas desatualizada.
- `Aplicativo/back/src/security/rateLimit.ts`: expõe metadados imutáveis do limitador para documentação. Limites, chaves e respostas de rate limit não foram alterados.
- `shared/api-spec/openapi.yaml`: adiciona `GET /readyz`, `GET /v1/accounts/availability` e `POST /v1/onboarding/interests`; corrige `/v1/social/accounts/{accountId}/posts` para GET e alinha parâmetros, esquemas e respostas aos handlers.
- Código cliente e schemas gerados via Orval; `shared/contracts/src/auth.ts` reutiliza o schema gerado de onboarding sem remover as validações de domínio.
- `docs/api/backend/routes.generated.md` e `endpoints.md` passam a ser gerados do inventário real. As rotas ficam rotuladas como **MONTADA EM CÓDIGO**, sem confundir registro com funcionalidade validada.
- Catálogo estático de planejamento movido para `docs/roadmap/seekalive-operation-catalog.json` e `.md`, marcado como não normativo; caminhos vigentes de mídia e salvos são explicitados para distinguir propostas históricas; `docs/api/backend/openapi.json` foi removido.
- `docs/api/backend/queries/development-database-catalog.sql` fornece consulta somente leitura para o catálogo físico. O estado atual do banco não é afirmado nos documentos.
- `docs/api/backend/feed-route-validation.md` registra, uma a uma, as 11 operações do Feed, os testes existentes, a evidência obtida e os limites de validação.
- `Aplicativo/back/test/feed-interactions-application.test.mjs` e `scripts/package.json` adicionam testes sem banco para criação/listagem/exclusão de comentários, curtidas e reposts, incluindo autorização de leitura antes da mutação.
- `render-docs.mjs` ganhou modo `--check`; HTML e Markdown consolidados foram regenerados. O ZIP técnico foi atualizado com a documentação atual.
- Documentação vigente e relatórios históricos foram ajustados para refletir as regras atuais: `private` inclui titular e seguidores aprovados do perfil privado; campos de apresentação e avaliações pertencem a Profiles; Seek apenas consome projeções autorizadas; estados físicos dependem da consulta de catálogo. `docs/architecture/database-domains.md` e `docs/api/backend/data-dictionary.md` não afirmam existência/ausência física sem evidência.

### Evidência

- `pnpm --filter @workspace/api-spec run codegen`: passou; Orval 8.44.0 regenerou os clientes e o typecheck de bibliotecas passou.
- `pnpm -w run typecheck`: passou para os pacotes do workspace.
- `pnpm --filter @workspace/scripts run test:backend`: 67 testes passaram em todos os grupos, incluindo segurança, conexão/configuração de banco sem conexão física, runtime de API, paridade de rotas, Feed, mídia e avaliações de Profiles.
- `pnpm --filter @workspace/scripts run test:api-route-contract`: passou; 76 rotas e zero divergências de método/caminho/CSRF. O comando também verifica arquivos gerados desatualizados.
- `pnpm audit --prod=false`: nenhuma vulnerabilidade conhecida.
- Testes negativos sintéticos confirmam que a paridade falha quando método/caminho diverge e que o verificador documental rejeita artefatos ausentes ou desatualizados.
- A suíte de Feed passou com 10 testes de listagem/política e 18 testes de visibilidade e aplicação; os 11 comportamentos da matriz têm evidência de unidade/aplicação ou de rejeição HTTP sem sessão/CSRF.
- A geração das rotas, catálogo e documentos consolidados foi repetida duas vezes; os hashes dos seis artefatos gerados permaneceram idênticos.
- `git diff --check` e a busca de whitespace nos novos arquivos passaram. Busca final não encontrou as afirmações obsoletas nem rótulos `ATIVA` nos inventários atuais; relatórios históricos datados foram preservados.
- Uma checagem intermediária falhou corretamente porque o consolidado ainda não havia sido regenerado após a edição da matriz. Após regenerar HTML/Markdown, a verificação final de staleness passou.
- Uma repetição intermediária revelou erro de sintaxe no wrapper do rate limit; foi corrigido preservando a função arrow original. A repetição final do typecheck e da suíte passou.

### Não verificado

- A consulta de catálogo não foi executada; presença física atual de tabelas, índices, constraints e ações referenciais permanece não verificada.
- Não foi feita validação HTTP autenticada ponta a ponta das 11 operações; os testes positivos existentes usam fixture que cria schema, executa `push` e `DROP SCHEMA`.
- Os testes que criam schemas ou executam DDL (`test:api-isolated-db`) foram deliberadamente excluídos.

### Restrições respeitadas

Nenhum push, migration, DDL, escrita de banco, consulta de dados de negócio, acesso à produção ou leitura/exposição de segredos ocorreu. A execução de `test:backend` chamou `GET /readyz`, cujo health check executa apenas `SELECT 1` no banco configurado; isso verifica disponibilidade, sem consultar dados de negócio. Não houve mudança de regra de negócio nem atualização de Zod/Orval.

## Pendências e ações concluídas

| Item | Status | Motivo/bloqueio | Próxima ação | Critério de encerramento |
|---|---|---|---|---|
| Fluxos HTTP autenticados e persistência das 11 operações do Feed | Bloqueado pelas restrições deste plano | O único fixture de integração disponível executa `push` e DDL; este plano proíbe ambos. Testes de unidade/aplicação e rejeições sem sessão/CSRF não provam o sucesso HTTP nem a persistência. | Em etapa autorizada para integração, usar banco/schema de teste descartável previamente isolado ou revisar o fixture para não executar DDL implicitamente; executar a suíte sem tocar produção. | As 11 operações passam em chamadas HTTP autenticadas, incluindo autorização por titular, validação/CSRF, persistência, idempotência e exclusões/cascatas pertinentes; a execução demonstra isolamento do banco de desenvolvimento e não usa produção. |
| Estado físico atual dos schemas e constraints | **Concluído — consulta somente leitura em 31/10/2026** | O banco de desenvolvimento identificado pela consulta como `heliumdb` retornou 28 tabelas, 61 índices, 79 constraints e 33 FKs (30 `CASCADE`, 3 `SET NULL`). Nenhuma linha de negócio foi consultada. | Manter a SQL reutilizável e, quando necessário, gerar novo retrato datado; não transformar estes números em estado permanente. | Resultado datado identifica o ambiente e lista somente metadados do catálogo; documentos gerais apontam para a consulta, não para contagens fixas. Ver [relatório](../api/backend/development-database-catalog-2026-10-31.md). |

## Continuação da execução — consulta de catálogo após solicitação “Faça”

### Mudou

- Executada em `development` a consulta de `docs/api/backend/queries/development-database-catalog.sql`, sem linhas de negócio, DDL, migrations ou escritas.
- Criado `docs/api/backend/development-database-catalog-2026-10-31.md`, com o retrato observado por schema, totais de objetos, ações de FKs e limites da evidência.
- `data-dictionary.md` e `README.md` agora apontam para o relatório datado e preservam a consulta SQL como autoridade para futuras verificações.
- O renderer da documentação inclui o relatório físico como seção separada.

### Evidência

- A consulta retornou o banco `heliumdb`, no ambiente de desenvolvimento: 28 tabelas (22 de domínio e seis journals em `drizzle`), 61 índices, 79 constraints e 33 FKs. As ações de exclusão observadas foram 30 `CASCADE` e três `SET NULL`.
- O schema `profiles` retornou cinco tabelas: `account_profiles`, `business_profiles`, `account_follows`, `account_follow_requests` e `account_blocks`; não retornou tabela de avaliações.
- Nenhuma linha de usuário/conteúdo foi lida; somente catálogos PostgreSQL foram consultados.

### Não verificado / bloqueio restante

- A validação HTTP autenticada ponta a ponta das 11 operações do Feed ainda não foi executada. O fixture existente cria schema, executa `db push`, grava dados e remove o schema com `DROP SCHEMA ... CASCADE`.
- A solicitação “Faça” não autoriza, por si só, a alteração do banco de desenvolvimento por DDL. Para executar essa suíte, é necessária autorização explícita após informar o alvo e o ciclo de criação/limpeza do schema temporário.
