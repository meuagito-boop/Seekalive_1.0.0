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
2. Na repetição do Gate 1 em 29/10/2026, `pnpm --filter @workspace/db run check` passou e a suíte isolada `pnpm --filter @workspace/scripts run test:api-isolated-db` passou em 5/5 no banco de desenvolvimento confirmado. Ela criou/removeu um schema aleatório, capturou e-mails em memória e não chamou Resend. A migration `0005` também foi executada isoladamente: dois casos válidos passaram, seis inválidos foram rejeitados, seis constraints e três índices foram confirmados; o fingerprint das colunas, constraints, índices e views consultados permaneceu igual e nenhuma tabela temporária ficou. Isso não prova integração do navegador nem entrega real de e-mail.
3. O Gate 0A foi reaberto e passou por uma segunda revisão em 29/10/2026. A varredura AST refeita encontrou zero ciclos e zero arquivos apenas de reexport em 275 arquivos frontend e 213 backend; os testes de fronteira confirmaram a separação `application`/`presentation` de persistência. Foi corrigida uma expectativa obsoleta em um teste de guard de ambiente. `SocialApplicationContext` continua amplo, mas funciona como composição do estado do cliente; as regras permanecem nos domínios.
4. O código-fonte do banco define **13 tabelas em 5 schemas com tabelas**. A consulta read-only refeita em 29/10/2026 no `heliumdb` confirmou 12 tabelas físicas em `accounts` (4), `profiles` (3), `security` (4) e `seek` (1); `feed.posts` continua no modelo e na migration `0005`, mas ausente fisicamente. O journal local tem seis entradas e `drizzle-kit check` passou; nenhum comprova histórico de aplicação. O SQL versionado `0005` e a suíte API foram validados em schemas temporários; o fingerprint das colunas, constraints, índices e views consultados não mudou. Não foi encontrada tabela de histórico com nome contendo `drizzle` ou `migration`. O pós-merge configura `drizzle-kit push` em desenvolvimento. Nenhuma linha de usuário foi consultada nem produção acessada.
5. O Gate 1 foi refeito em 29/10/2026: modelo, journal, estado físico, docs fonte, HTML e ZIP foram reconciliados novamente. Continua impossível provar pelo catálogo qual ferramenta aplicou historicamente cada objeto; a documentação não infere essa sequência. Outras divergências de frontend/contrato identificadas pela auditoria não foram tratadas como resolvidas pelo Gate 1.
6. Dependências diretas do workspace usam Zod `4.6.7`; Orval está em `8.44.0`. Não encontrei conflito de versões diretas Zod/Orval nos pacotes inspecionados. Versões transitivas no lockfile não devem ser tratadas como conflito sem demonstrar incompatibilidade.
7. A linha de base da auditoria tinha **1.005 arquivos**: 997 anteriores e oito documentos na pasta de auditoria. Os totais intermediários por etapa foram 1.010 (`accounts`), 1.024 (`auth`), 1.030 (`feed`), 1.032 (`health`) e 1.034 (`onboarding`). A contagem atual em 28/10/2026 é **1.300 arquivos**, excluindo árvores `node_modules`; o catálogo mantém a linha de base e os deltas estruturais registrados.

## Método e limites

- Conferi a árvore completa e contei arquivos por diretório, extensão e pacote.
- Inspecionei manifests, configurações de workspace e execução, código-fonte de front e API, schemas/migrações, contratos, testes, documentação, relatórios, builds, mapas de origem e assets.
- Não usei agentes paralelos: a execução sequencial manteve uma única cadeia de evidências e validação entre os arquivos relacionados.
- Para cada arquivo do inventário, registrei categoria, finalidade inferida do caminho/conteúdo e referências diretas detectáveis. “Nenhuma referência detectada” não significa arquivo órfão: entradas, recursos estáticos, arquivos gerados, configuração e código referenciado por convenção podem não ter importador textual.
- O inventário exclui somente árvores de dependências instaladas (`node_modules`, incluindo `.pnpm`). Não havia diretório `.git` em `Seekalive/Projeto`. Diretórios vazios não são linhas do inventário.
- A análise de conexões é estática e delimitada ao conteúdo existente; não prova comportamento de integrações remotas, ambiente publicado, banco físico, contas reais, fluxos autenticados em navegador ou dispositivos de produção.
- A árvore e o catálogo integral registram a linha de base de 1.005 arquivos e deltas por etapa. A contagem atual foi refeita em 28/10/2026: 1.300 arquivos, excluindo `node_modules`; as mudanças estruturais de Social e Segurança estão detalhadas no catálogo. Essa contagem inclui código, documentação, testes, configurações e artefatos presentes no diretório do projeto; não é uma contagem de arquivos de produção.

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

## Verificações executadas nas etapas anteriores

| Verificação | Resultado observado |
|---|---|
| `pnpm test` | Passou na validação mais recente do Onboarding: 100 testes, 0 falhas |
| `pnpm run typecheck` | Passou nos pacotes do workspace |
| `pnpm --filter @workspace/db run check` | Passou: Drizzle informou `Everything's fine` |
| `pnpm run build` | Passou; API, front e sandbox foram compilados |
| Reconciliação AST de imports | Frontend: 275 arquivos-fonte; backend: 213; zero ciclos e zero arquivos somente de reexport em ambos |
| Fronteiras da API | Nenhum import de `@workspace/db` ou `drizzle-orm` em `application`/`presentation`; nenhum import restante dos dois agregadores removidos |
| `pnpm test` / `pnpm build` após a reconciliação | Ambos passaram; suíte final 126/126, build incluiu typechecks e 97 chunks do frontend |
| Prettier / `git diff --check` | Passaram nos arquivos backend e scripts alterados nesta reconciliação |
| Inicialização da API | Workflow reiniciado e ouvindo na porta 8080; `/api/healthz` e `/api/readyz` retornaram 200. `/` retorna 404 `NOT_FOUND` porque a API não serve a interface web na raiz |
| Banco de desenvolvimento isolado | Teste autorizado passou em 5/5 com schema temporário removido ao final; fingerprint do schema `public` permaneceu inalterado |
| `git diff --check` | Passou após a última reorganização e atualização da auditoria |

O teste de banco isolado exige a confirmação explícita do nome esperado além das variáveis de conexão. O destino foi confirmado por consulta read-only (`current_database() = heliumdb`) e a suíte autorizada passou com `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1` e `SEEKALIVE_EXPECTED_DATABASE=heliumdb`. Ela removeu o schema aleatório; a consulta posterior confirmou zero schemas `seekalive_test_*`. Isso não autoriza nem representa alteração no schema principal.

### Reconciliação estrutural final do Gate 0A — 28/10/2026

A varredura AST final cobriu 275 arquivos TypeScript/TSX de `Aplicativo/front/src` e 213 arquivos TypeScript de `Aplicativo/back/src`. Não encontrou ciclos de importação nem módulos que contenham somente reexports. No backend, dois agregadores de segurança sem responsabilidade própria foram removidos: `security/request-origin.ts` e `security/session.ts`. Os consumidores agora importam diretamente de `trustedClientIp`, `rateLimit`, `sessionConfig`, `sessionCookies`, `activeSession`, `csrf` e `tokenHashing`; os testes de fronteira também foram atualizados. Nenhuma rota, contrato HTTP, regra de negócio ou efeito de sessão foi alterado.

Os candidatos frontend sem importador interno foram classificados, não apagados às cegas: componentes da biblioteca reutilizável `components/ui`, o catálogo TypeScript do sistema de design e os contratos REST explicitamente propostos e ainda desativados. `forwarded-client-ip.ts` é usado pela configuração Vite, fora de `src`. Não foi encontrada evidência de arquivo funcional órfão que justificasse remoção adicional nesta reconciliação.

### Segunda revisão rigorosa do Gate 0A — 29/10/2026

- A regra de dupla revisão foi registrada em memória do projeto. O Gate 0A foi reaberto; esta rodada revalidou os critérios estruturais sem reexecutar alterações de organização já concluídas.
- Varredura AST independente com resolução de módulos TypeScript: `front/src` — 275 arquivos, 873 arestas internas; `back/src` — 213 arquivos, 535 arestas internas. Resultado em ambos: zero ciclos e zero arquivos compostos somente por imports/exports.
- A inspeção de fronteiras e os testes de injeção confirmaram que os módulos de aplicação/apresentação avaliados delegam persistência por portas/composição, sem import direto de `@workspace/db` ou `drizzle-orm`.
- A primeira execução da suíte encontrou uma falha de teste, não de proteção runtime: `security-boundaries.test.mjs` ainda procurava o marcador de publicação no antigo arquivo de integração, embora o guard tivesse sido extraído para `back/test/support/isolatedDatabaseFixture.mjs`. O teste foi corrigido para apontar ao módulo proprietário e agora executa o guard com `REPLIT_DEPLOYMENT=1`, mesmo com `NODE_ENV=test`.
- Validações finais: teste focado de fronteira passou 8/8; `pnpm test` passou 256/256; `pnpm build` passou com typechecks de todos os workspaces e 97 chunks frontend; Prettier no teste alterado e `git diff --check` passaram.
- Limite mantido: a interface autenticada não foi verificada visualmente. O usuário dispensou essa inspeção anteriormente; o gate estrutural não afirma validação visual ou completude funcional de módulos.

## Achados prioritários

| Prioridade | Achado | Evidência e consequência |
|---|---|---|
| Observação arquitetural | O contexto de estado do front agrega Feed/Social, Seek, Mensagens e Notificações | [`SocialApplicationContext.tsx`](../Aplicativo/front/src/modules/app/state/SocialApplicationContext.tsx), [`socialApplicationTypes.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationTypes.ts), [`socialApplicationState.ts`](../Aplicativo/front/src/modules/app/state/socialApplicationState.ts). É a composição global de estado; regras, reducers e ações permanecem nos domínios. Foi mantido sem divisão cosmética, conforme evidência disponível. |
| Resolvido na reconciliação | Fronteiras de persistência da apresentação e arquivos agregadores de Segurança | A verificação atual não encontra imports de DB/Drizzle em `application`/`presentation`, nem ciclos ou arquivos apenas de reexport. As rotas de Profiles e Social recebem suas operações por composição; os agregadores `request-origin.ts` e `session.ts` foram removidos. |
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
- A auditoria inicial preservou documentos históricos e registrou suas divergências. As conclusões e o plano receberam atualizações datadas após as etapas estruturais; documentos antigos fora da pasta de auditoria não foram apagados nesta tarefa.

## Próximas ações técnicas recomendadas

1. Apresentar a reconciliação final do Gate 0A ao usuário e aguardar sua revisão; não iniciar expansão funcional nem novo módulo antes dessa revisão.
2. Depois da revisão, retomar as etapas posteriores do plano na sequência aprovada. A diferença `feed.posts` e as validações SQL de Feed/Profiles permanecem para gates futuros; não foram aplicadas nesta reconciliação.
