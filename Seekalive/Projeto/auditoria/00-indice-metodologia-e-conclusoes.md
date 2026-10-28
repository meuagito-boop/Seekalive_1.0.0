# Auditoria integral do projeto Seekalive

**Data do levantamento:** 26/10/2026  
**Escopo:** tudo que é arquivo dentro de `Seekalive/Projeto`, exceto conteúdo instalado de dependências (`node_modules` e o conteúdo de `.pnpm`).  
**Resultado inicial:** inventário do estado encontrado e análise das ligações entre arquivos. A partir de 26/10/2026, iniciou-se uma correção estrutural controlada por domínio; as alterações e validações posteriores são registradas abaixo e no delta do catálogo.

## Navegação

- [Árvore e catálogo da raiz](01-arvore-e-catalogo-da-raiz.md)
- [Back-end, banco e domínios](02-backend-e-banco.md)
- [Front-end e módulos de produto](03-frontend.md)
- [Contratos, documentos e validações](04-contratos-documentacao-e-validacoes.md)
- [Documentação, artefatos e materiais de apoio](05-documentos-artefatos-e-assets.md)
- [Catálogo integral de arquivos](06-catalogo-integral-de-arquivos.md)
- [Plano de ação por frentes e gates](plano-de-acao-tecnico.md)

## Conclusões executivas

1. A estrutura é um monorepo pnpm com o aplicativo React/Vite, API Express, banco Drizzle/PostgreSQL, contratos OpenAPI/Zod, cliente React gerado, sandbox de componentes, scripts, documentação e materiais de validação.
2. Na etapa atual, `pnpm test` e `pnpm build` passaram; a suíte isolada `pnpm --filter @workspace/scripts run test:api-isolated-db` também passou em 5/5 no banco de desenvolvimento confirmado. Ela criou/removeu um schema aleatório, capturou e-mails em memória e não chamou Resend; o fingerprint de `public` permaneceu igual e uma consulta posterior não encontrou schema temporário. Isso não prova integração do navegador nem entrega real de e-mail.
3. A arquitetura apresenta separação real em muitos módulos, mas ainda não cumpre integralmente a separação por domínio pedida: `SocialApplicationContext` e seus tipos expõem operações de cinco domínios, e a composição do reducer de estado da aplicação fica em `modules/app/state`. Auth e Feed agora mantêm persistência fora dos adaptadores HTTP e da aplicação; ainda há rotas de Profiles e Social com consultas SQL diretas.
4. O código-fonte do banco define **13 tabelas em 5 schemas com tabelas**. A comparação read-only no `heliumdb` confirmou 12 tabelas físicas em `accounts` (4), `profiles` (3), `security` (4) e `seek` (1); as colunas (tipo, tamanho, nulabilidade e default), constraints, FKs e índices dessas 12 correspondem ao DDL exportado do modelo. A diferença física identificada é `feed.posts`, ausente no schema `feed`, embora esteja definida na migration `0005`. A ordem das colunas de `accounts.accounts` difere por migrations aditivas anteriores, mas os atributos das colunas correspondem por nome. Não foi encontrada tabela de histórico de migrations com nome contendo `drizzle` ou `migration`; essa limitação está registrada.
5. Existem documentos gerados ou históricos que divergem do código atual, incluindo o catálogo de tabelas, o mapa de integração do front, a auditoria de prontidão do front, o status de recuperação de senha e a classificação de algumas operações de Feed.
6. Dependências diretas do workspace usam Zod `4.6.7`; Orval está em `8.44.0`. Não encontrei conflito de versões diretas Zod/Orval nos pacotes inspecionados. Versões transitivas no lockfile não devem ser tratadas como conflito sem demonstrar incompatibilidade.
7. A linha de base da auditoria tinha **1.005 arquivos**: 997 anteriores e oito documentos na pasta de auditoria. Após `accounts`, o total intermediário era 1.010; após `auth`, 1.024; após `feed`, 1.030; após `health`, 1.032; após `onboarding`, o total observado passou a **1.034 arquivos**. O catálogo mantém a linha de base e registra os deltas por etapa.

## Método e limites

- Conferi a árvore completa e contei arquivos por diretório, extensão e pacote.
- Inspecionei manifests, configurações de workspace e execução, código-fonte de front e API, schemas/migrações, contratos, testes, documentação, relatórios, builds, mapas de origem e assets.
- Não usei agentes paralelos: a execução sequencial manteve uma única cadeia de evidências e validação entre os arquivos relacionados.
- Para cada arquivo do inventário, registrei categoria, finalidade inferida do caminho/conteúdo e referências diretas detectáveis. “Nenhuma referência detectada” não significa arquivo órfão: entradas, recursos estáticos, arquivos gerados, configuração e código referenciado por convenção podem não ter importador textual.
- O inventário exclui somente árvores de dependências instaladas (`node_modules`, incluindo `.pnpm`). Não havia diretório `.git` em `Seekalive/Projeto`. Diretórios vazios não são linhas do inventário.
- A análise de conexões é estática e delimitada ao conteúdo existente; não prova comportamento de integrações remotas, ambiente publicado, banco físico, contas reais, fluxos autenticados em navegador ou dispositivos de produção.
- A árvore e o catálogo integral registram o estado inicial de 1.005 arquivos. `accounts` acrescentou sete caminhos e removeu dois, totalizando 1.010; `auth` acrescentou 14, totalizando 1.024; `feed` acrescentou sete e removeu um, totalizando 1.030; `health` acrescentou dois, totalizando 1.032; `onboarding` acrescentou dois, totalizando 1.034. O inventário integral será refeito após a etapa estrutural, para não misturar a linha de base com mudanças ainda em andamento.

## Atualização da primeira unidade estrutural — 26/10/2026

- **Escopo:** somente o domínio backend `accounts` e os importadores diretamente afetados; nenhuma mudança foi feita no frontend, no schema do banco, em migrations, nas regras de conta ou em produção.
- **Correção:** consultas de leitura foram separadas em infraestrutura; a montagem da projeção de conta foi separada do acesso a dados; privacidade e política de @ ficaram em arquivos de domínio; o lock transacional de @ foi separado da regra de cooldown.
- **Verificações:** `pnpm test` passou com 95 testes; `pnpm typecheck` passou no workspace; `pnpm --filter @workspace/api-server build` passou; a API foi reiniciada e iniciou na porta 8080; a captura do preview exibiu a tela inicial sem erros de console da aplicação.
- **Limite:** não foi executado teste de integração com escrita no banco; esta unidade não altera schema nem migrations. Outras pastas do frontend e backend ainda precisam ser revisadas.

## Atualização da segunda unidade estrutural — backend `auth` — 26/10/2026

- **Escopo:** os 50 arquivos atuais de `Aplicativo/back/src/modules/auth`, seus handlers e operações de aplicação diretamente relacionados, mais a inicialização do perfil comercial no domínio Profiles e um teste de fronteira. Não foram alterados contratos HTTP, schema, migrations, regras de autenticação, integrações, frontend, Gestor, Painel ou dados do banco.
- **Correção:** retirados imports/operações Drizzle dos handlers de cadastro, CSRF, sessões, dispositivos confiáveis, verificação de e-mail, verificação de instalação e atualização/recuperação de senha. Cada fluxo persistente agora é chamado por uma operação própria em `application`; as transações de segurança continuam atômicas. A criação inicial de `commercialProfiles` agora pertence a `profiles/application/initializeCommercialProfile.ts`, executada dentro da mesma transação de criação da conta.
- **Verificações:** `pnpm test` passou com 96 testes, incluindo o novo teste de fronteira de Auth; `pnpm run typecheck` passou no workspace; `pnpm --filter @workspace/api-server build` passou; não foram detectados ciclos de import local no domínio Auth; `git diff --check` passou.
- **Limite:** o teste de integração com schema temporário foi tentado com a barreira explícita, mas o próprio teste parou antes de conexão ou escrita porque `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE` não estavam configuradas. Nenhuma migration, tabela ou schema foi criado/alterado. A reorganização Gate 0A permanece em andamento; Auth não significa que Profiles, Social, Feed ou frontend estejam concluídos.

## Atualização da terceira unidade estrutural — backend `feed` — 26/10/2026

- **Escopo:** o módulo Feed e o registro do teste de fronteira na suíte raiz. Foram preservados endpoint, formato das respostas, validação, rate limits, CSRF, visibilidade, paginação, schemas e migrations; não houve mudança no frontend, em OpenAPI/cliente gerado, no banco, em Profiles, Gestor ou Painel.
- **Correção:** o domínio agora possui tipo próprio de publicação, repositório único para acesso Drizzle à tabela `feed.posts`, casos de uso de aplicação sem acesso direto ao banco e adaptadores separados para criação/exclusão de publicação e leitura/escrita de artigos. A composição das rotas mantém os mesmos caminhos. A política de privacidade continua sendo recalculada em cada leitura.
- **Verificações do Feed naquela etapa:** `pnpm test` passou com 97 testes; `pnpm run typecheck` passou no workspace; `pnpm --filter @workspace/api-server build` passou; teste de fronteira confirmou que Feed `application` e `presentation` não acessam Drizzle diretamente; a verificação estática encontrou zero ciclos entre os 125 arquivos TypeScript dos módulos backend; `git diff --check` passou. O resultado acumulado mais recente está registrado na unidade Health abaixo.
- **Limite:** o repositório foi typechecked e compilado, mas não foi validado contra banco real/temporário porque as variáveis de destino de desenvolvimento continuam ausentes. Nenhum SQL foi executado contra o banco. Interações (curtidas, comentários, repostagens), upload/mídia e algoritmo cronológico/recomendado permanecem fora da capacidade implementada e não foram simulados nesta etapa.

## Atualização da quarta unidade estrutural — backend `health` — 26/10/2026

- **Escopo:** os três arquivos Health preexistentes, um novo adapter de infraestrutura, a composição central de rotas e testes de contrato/camada. Nenhuma rota, resposta HTTP ou configuração de banco foi alterada.
- **Correção:** `SELECT 1` foi retirado do handler HTTP e concentrado em `health/infrastructure/databaseReadiness.ts`. O adaptador de prontidão recebe a verificação por injeção; `modules/index.ts` liga a implementação concreta. O liveness segue independente do banco. Não foi criada camada `application`: neste caso ela seria apenas uma função pass-through sem regra/orquestração própria.
- **Comportamento preservado:** `/healthz` continua respondendo `200 {"status":"ok"}`; `/readyz` faz `SELECT 1` com `query_timeout` de 1,5 s e responde `200 {"status":"ready"}` ou `503 {"status":"not_ready"}`, sem expor detalhes da falha.
- **Verificações:** teste focado de Health passou (2); `pnpm test` passou com 99 testes; typecheck completo do workspace e build da API passaram; `git diff --check` passou após o registro desta etapa. A suíte de runtime também observou `/api/readyz` responder 200 neste ambiente, e os testes injetados cobriram as respostas de sucesso e falha.
- **Limite conhecido preservado:** o OpenAPI declara `/healthz`, mas não `/readyz`. Não alterei o contrato OpenAPI nesta tarefa estrutural; a cobertura formal de `/readyz` deve ser decidida e corrigida numa revisão de contrato, não por mudança silenciosa nesta etapa.
- **Nota de compatibilidade:** o typecheck detectou que `@types/pg` não declara `query_timeout` no tipo de consulta, embora `pg` 8.20.0 o leia no objeto de query em runtime. Isso foi verificado no código instalado do driver. A opção foi mantida em objeto nomeado, sem cast nem supressão, preservando o prazo existente e passando o typecheck.

## Atualização da quinta unidade estrutural — backend `onboarding` — 27/10/2026

- **Escopo:** os dois arquivos TypeScript preexistentes do domínio, um adapter de persistência, teste de fronteira, e registro na suíte raiz. A rota `/v1/onboarding/interests`, sua validação, sessão, CSRF e formato de resposta permaneceram inalterados.
- **Correção:** a aplicação mantém a regra `skipped → interesses vazios` e o total de interesses selecionados; o novo adapter de infraestrutura concentra a transação que substitui as preferências em `account_interests` e atualiza `onboardingCompletedAt`/`updatedAt` da conta ativa. A atomicidade foi preservada. Nenhuma nova camada de domínio foi criada porque não há regra que justifique outra abstração.
- **Verificações:** teste de fronteira Onboarding passou; `pnpm test` passou com 100 testes; typecheck do workspace e build da API passaram. A leitura e escrita Drizzle ficam apenas em `onboarding/infrastructure/onboardingRepository.ts`.
- **Limite de integração:** `pnpm --filter @workspace/scripts run test:api-isolated-db` foi executado, mas parou antes de conexão porque `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1` não está habilitado. Nenhum schema temporário foi criado e nenhuma escrita foi feita. O caso de integração de Onboarding existente não foi validado nesta execução; não contornei a proteção.
- **Contrato/documentação:** o código implementa `POST /v1/onboarding/interests`, mas a rota não aparece no OpenAPI atual. Não alterei a especificação nem clientes gerados nesta reorganização.

## Verificações executadas nesta auditoria

| Verificação | Resultado observado |
|---|---|
| `pnpm test` | Passou na validação mais recente do Onboarding: 100 testes, 0 falhas |
| `pnpm run typecheck` | Passou nos pacotes do workspace |
| `pnpm --filter @workspace/db run check` | Passou: Drizzle informou `Everything's fine` |
| `pnpm run build` | Passou; API, front e sandbox foram compilados |
| Banco de dados real/integrado | Teste de schema temporário bloqueado antes da conexão por ausência de `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE`; nenhuma leitura/escrita foi feita |
| `git diff --check` | Passou após a última reorganização e atualização da auditoria |

O teste de banco isolado exige a confirmação explícita do nome esperado além das variáveis de conexão. O destino foi confirmado por consulta read-only (`current_database() = heliumdb`) e a suíte autorizada passou com `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1` e `SEEKALIVE_EXPECTED_DATABASE=heliumdb`. Ela removeu o schema aleatório; a consulta posterior confirmou zero schemas `seekalive_test_*`. Isso não autoriza nem representa alteração no schema principal.

## Achados prioritários

| Prioridade | Achado | Evidência e consequência |
|---|---|---|
| Alta | Um contexto de estado no front agrega Feed/Social, Seek, Mensagens e Notificações | [`SocialApplicationContext.tsx`](../Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx), [`socialApplicationTypes.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationTypes.ts), [`socialApplicationState.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationState.ts). Reducers e ações estão distribuídos por domínio, mas a API global ainda cruza essas fronteiras. |
| Alta | Parte da camada de apresentação da API ainda contém acesso direto ao banco | Corrigido em Auth; Feed agora também mantém SQL somente em infraestrutura. Permanecem rotas de Profiles e Social; a composição de perfil público também está na apresentação. Esses pontos seguem acoplando HTTP à persistência/composição de domínio. |
| Alta | O modelo Drizzle e o banco de desenvolvimento divergem | A comparação de metadados confirmou que a única diferença estrutural conhecida é `feed.posts`: 13 tabelas no modelo e 12 no `heliumdb`. Não há tabela de histórico de migrations identificada pelos metadados consultados. |
| Média | Documentação de integração e prontidão contém contagens e caminhos antigos | `frontend-integration.md` e `frontend-readiness-audit.md` usam estrutura/contagens anteriores; não devem servir sozinhos como contrato de implementação atual. |
| Média | Documentação de recuperação de senha e de Feed está parcialmente desatualizada | Há rotas/serviços de redefinição no código; parte da documentação declara a recuperação não implementada. O código tem rotas de posts/artigos, enquanto contratos/documentos de backend tratam itens de Feed como proposta ou dependem da migração ainda pendente. |
| Média | O artefato `.replit` especifica Node 20, mas esta execução usa Node `22.23.4` | O projeto compilou nesta sessão; a diferença de runtime precisa ser resolvida/testada na configuração antes de depender dela em execução reproduzível. |
| Baixa | `.npmrc` desliga instalação automática e validação estrita de peers | Não prova incompatibilidade por si só, mas reduz o sinal de avisos de peers; manter a decisão documentada e revisar avisos após mudanças de dependências. |

## O que esta auditoria não declara

- Não declara a aplicação “perfeita”, pronta para produção, nem todos os módulos concluídos.
- Não declara que as migrações estão aplicadas ao banco.
- Não declara que todas as telas usam API real. O front contém adaptadores e dados de demonstração explicitamente locais, além de módulos ainda sem backend.
- Não declara que cada fluxo foi testado por navegação automatizada ou por uma conta real; os testes executados são os listados acima.
- Não atualiza nem apaga documentos antigos. As divergências foram mantidas e apontadas, pois a tarefa pediu auditoria, não limpeza ou reescrita histórica.

## Próximas ações técnicas recomendadas

1. Apresentar e obter aprovação para a única diferença confirmada (`feed.posts` da `0005`), com impacto e rollback; se aprovada, sincronizar somente o banco de desenvolvimento e confirmar o resultado fisicamente.
2. Atualizar os documentos de backend e front a partir do código e contratos atuais, identificando claramente documento-fonte, artefato gerado e histórico.
3. Definir a fronteira do estado compartilhado do front: preservar a orquestração necessária, mas impedir que o contexto de `app` se torne API de negócio de todos os módulos.
4. Mover operações persistentes das rotas de apresentação para casos de uso/repositorios e testar o comportamento HTTP por meio de contratos estáveis.
5. Testar a compatibilidade com o runtime declarado pelo ambiente Replit e manter lockfile, catálogo de versões e manifests coerentes.
6. Somente depois dessas reconciliações, continuar expansão de módulos ou declarar qualquer etapa concluída para produção.
