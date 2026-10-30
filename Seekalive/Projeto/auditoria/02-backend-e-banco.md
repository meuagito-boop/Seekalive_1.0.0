# Back-end e banco de dados

## Arquitetura encontrada

O serviço de API fica em `Aplicativo/back`, pacote `@workspace/api-server`. O runtime é Express 5; schemas Zod e tipos são importados de `@workspace/api-zod`; persistência está em `infra/database` via Drizzle e PostgreSQL. O build de backend é configurado em `Aplicativo/back/build.mjs`, e o ponto de montagem das rotas é `Aplicativo/back/src/app.ts` → `modules/index.ts`.

Os módulos presentes em `Aplicativo/back/src/modules` são:

- `accounts`: regras comuns de conta, visibilidade e política de @.
- `auth`: cadastro, login/sessão, desafios, verificação de e-mail/dispositivo, alteração/recuperação de senha, e-mail e dispositivos/sessões confiáveis.
- `feed`: operações de texto/artigo existentes no código; cobertura de persistência e endpoints ainda precisa ser conciliada com as migrações e contratos.
- `health`: disponibilidade/health check.
- `onboarding`: gravação e leitura de interesses/conclusão.
- `profiles`: consulta/atualização de perfil próprio/público, privacidade e disponibilidade de @.
- `social`: seguir, solicitações, bloqueio, listas e círculo.
- `security`: proteção transversal da API e rotas relacionadas a conta/sessão.

Cada módulo usa diretórios de aplicação e apresentação em graus diferentes. A separação por pastas existe; a regra de que a apresentação somente converte HTTP em chamadas de aplicação foi corrigida para Auth, mas ainda não está completamente cumprida nos demais domínios.

## Entradas e fluxo de requisição

1. `src/app.ts` cria o Express, configura middleware e monta a API.
2. `src/modules/index.ts` monta routers dos módulos em `/v1` e organiza endpoints sociais.
3. Arquivos `presentation/*Routes.ts` validam path/body/estado de sessão e retornam respostas.
4. A aplicação contém casos de uso/regras em `application/`; a persistência usa a camada Drizzle/database.
5. O contrato compartilhado provê códigos e schemas consumidos tanto pelo cliente quanto pela API.

O proxy de desenvolvimento é configurado em `Aplicativo/front/vite.config.ts`: encaminha `/api` para o servidor de API e normaliza o IP encaminhado antes de o backend o aceitar. No backend, `trust proxy` permanece desligado; o helper de IP aceita a informação encaminhada somente a partir do proxy local esperado. IP é usado como dado transitório de segurança/rate limit; o token revogável é a identidade durável da instalação. Isso é comportamento de desenvolvimento verificado no código, não evidência de proxy de produção.

## Domínios de dados

Os schemas/tabelas Drizzle estão em `infra/database/src/schema/`:

| Schema PostgreSQL | Arquivo de schema | Tabelas declaradas em código                                                       | Domínio                                                                |
| ----------------- | ----------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `accounts`        | `accounts.ts`     | `accounts`, `account_emails`, `account_interests`, `account_username_reservations` | Identidade da conta, e-mail, interesses e reservas temporárias do @    |
| `security`        | `security.ts`     | `password_credentials`, `auth_challenges`, `trusted_devices`, `sessions`           | Credenciais, desafios de confirmação, instalações confiáveis e sessões |
| `profiles`        | `profiles/relationships.ts`, `profiles/businessProfiles.ts` | `account_follows`, `account_follow_requests`, `account_blocks`, `business_profiles` | Relações e extensão comercial; nomes/bio pessoais e comerciais ainda são lidos de `accounts.accounts` |
| `feed`            | `feed.ts`         | `posts`                                                                            | Publicações                                                            |

**Modelo fonte atual:** 13 tabelas em 4 schemas com tabelas; `business_profiles` pertence a Profiles. Seek não possui tabela implementada no modelo fonte. Nomes e bios ainda não foram extraídos de `accounts.accounts`, então o ownership completo dos dados de perfil continua pendente. A configuração reconhece 12 schemas de domínio, além de `public`; vários domínios ainda não possuem tabelas.

**Divergência de desenvolvimento ainda não aplicada:** o banco compartilhado observado na auditoria anterior mantém fisicamente `seek.business_profiles`. A migration `profiles/0001_talented_clint_barton.sql` transfere a tabela para `profiles` sem recriar ou apagar seus registros. Ela está preparada, mas não aplicada; por isso o estado físico anterior não deve ser confundido com a propriedade do modelo fonte atual.

### Migrações

- `0000_high_avengers.sql` cria as 11 tabelas iniciais.
- `0001_ancient_spitfire.sql` adiciona reservas de @ e timestamps de alteração (12 tabelas após a migração).
- `0002_magenta_ser_duncan.sql` amplia desafios com e-mail pendente.
- `0003_fuzzy_otto_octavius.sql` cria/move tabelas para schemas de domínio.
- `0004_noisy_gargoyle.sql` registra schemas futuros ainda sem tabelas.
- `0005_mushy_centennial.sql` cria `feed.posts` (13ª tabela no modelo).

O `drizzle-kit check` passou sobre a consistência do journal/arquivos locais; isso não confirma aplicação física. Na reconferência somente de metadados em 29/10/2026 no ambiente `development`, `current_database()` retornou `heliumdb`. Existem 12 schemas lógicos de domínio e `public`; `public` não contém tabelas base. Os schemas de domínio `accounts`, `profiles`, `security` e `seek` contêm 12 tabelas no total; o schema `feed` existe, mas não contém tabela. A lista física contém os 12 nomes esperados até `0004`, e `feed.posts` está ausente. A consulta também confirmou zero schemas `seekalive_test_*` e não encontrou tabelas de histórico com nome contendo `drizzle` ou `migration`; não é possível inferir a sequência histórica de aplicação por esses metadados. O script de pós-merge configura `drizzle-kit push` no desenvolvimento; isso descreve a configuração, não a origem histórica de cada objeto físico.

**Reconciliação detalhada anterior:** a conferência de 28/10/2026 comparou colunas (tipos, tamanhos, nulabilidade e defaults), constraints, chaves estrangeiras e índices das 12 tabelas presentes com o modelo exportado; não identificou divergência nesses objetos. A ordem física das colunas em `accounts.accounts` diferia da ordem do DDL, sem diferença de atributos. **Rechecagem de 29/10/2026:** confirmou novamente os nomes das 12 tabelas, a quantidade de colunas/constraints/índices por tabela, `feed.posts` ausente e ausência de tabela de histórico. O fingerprint das colunas, constraints, índices e views consultados antes/depois do teste isolado da migration foi idêntico. A rechecagem de hoje não voltou a comparar cada definição de coluna do banco com o DDL; a comparação detalhada anterior permanece datada como evidência separada. Nenhuma migration foi aplicada ao schema principal nesta etapa.

### Matriz de reconciliação — modelo, journal e estado físico

O journal contém as seis entradas `0000`–`0005`. A coluna de migrations abaixo indica somente quais arquivos declaram/criam objetos do domínio; **não** afirma que tais arquivos foram aplicados. A consulta ao banco confirma presença física por nome de tabela e, para as 12 tabelas existentes, compara colunas, atributos, constraints, FKs e índices com o modelo Drizzle.

| Schema de domínio | Tabelas no modelo Drizzle | Migrations que declaram os objetos | Tabelas físicas em `heliumdb` | Resultado read-only |
|---|---:|---|---:|---|
| `accounts` | 4 | `0000`–`0003` | 4 | Correspondência física das quatro tabelas. |
| `security` | 4 | `0000`, `0002`–`0003` | 4 | Correspondência física das quatro tabelas. |
| `profiles` | 4 | `profiles/0000`, `profiles/0001` | 3 na medição anterior | Código atual inclui `business_profiles`; a migration de transferência ainda não foi aplicada. |
| `seek` | 0 | baseline `seek/0000` é legado; `0003` moveu a tabela histórica | 1 na medição anterior | Banco de desenvolvimento ainda contém a tabela legada até a migration Profiles `0001`. |
| `feed` | 1 | `0004` cria o schema; `0005` cria `posts` | 0 | Divergência: `feed.posts` existe no modelo e migration, não no banco. |
| `location` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |
| `media` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |
| `messages` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |
| `notifications` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |
| `search` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |
| `shop` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |
| `trust_safety` | 0 | `0004` cria o schema | 0 | Schema preparado; sem tabela no modelo atual ou no banco. |

`account_username_reservations` está entre as quatro tabelas físicas de `accounts`; `feed.posts` é a 13ª tabela modelada e a única diferença física identificada. A lista física foi consultada sem ler registros das tabelas. O ambiente de produção não foi consultado.

### Validação isolada de `0005_mushy_centennial.sql`

- Em 29/10/2026, o SQL versionado foi carregado do arquivo e executado no banco `development`, em schema temporário aleatório. Apenas os qualificadores de schema `feed` e a referência a `accounts.accounts` foram redirecionados ao namespace descartável; as definições da migration foram preservadas.
- A fixture criou nesse schema uma tabela `accounts` mínima para validar a FK. Dois registros válidos (texto e artigo) foram aceitos; seis casos inválidos foram rejeitados: audiência, formato, texto vazio, artigo incompleto, versão não positiva e autor inexistente. Foram confirmadas seis constraints (PK, FK e quatro checks) e três índices (PK e dois índices da migration).
- A remoção do schema foi verificada. O fingerprint das colunas, constraints, índices e views consultados antes/depois foi idêntico; a consulta final confirmou 12 tabelas permanentes, zero tabelas em `public`, ausência de `feed.posts` e zero schemas temporários. Nenhuma linha de usuário foi consultada ou alterada.
- **Suíte adicional em 29/10/2026:** `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE=heliumdb pnpm --filter @workspace/scripts run test:api-isolated-db` passou 5/5. Ela executou API real com persistência em schema isolado e e-mail em memória, removeu o schema e validou o fingerprint de `public`.
- **Histórico de limpeza:** em 28/10/2026 foi encontrado e removido um schema `seekalive_test_*` sem origem determinada. A nova execução começou sem schema temporário preexistente e terminou sem nenhum remanescente; o catálogo permanente permaneceu inalterado.
- **Limite:** a execução valida o DDL de `0005` e seus invariantes em isolamento; não aplica migrations ao schema principal, não comprova aplicação histórica de `0000`–`0004` e não substitui a integração funcional do Feed.

### Divergência de dicionário

`docs/api/backend/data-dictionary.md` apresentava a alegação de 12 tabelas, mas a relação nela exibida omitia `account_username_reservations`. Também misturava o modelo Drizzle atual com entidades futuras de `schema-core.sql` e afirmava estados físicos sem separar o journal do banco. A atualização documental agora distingue:

1. tabelas modeladas no código;
2. tabelas criadas pelas migrations versionadas;
3. migrations efetivamente aplicadas ao banco;
4. domínios futuros sem tabelas.

## Persistência e apresentação

A auditoria inicial encontrou imports de `@workspace/db` em 17 arquivos de apresentação. Na varredura atual dos arquivos TypeScript de `modules/*/presentation`, nenhum importa diretamente `@workspace/db` ou Drizzle. Isso comprova a direção dos imports no código-fonte, não a execução de cada integração com o banco.

As rotas de Profiles agora recebem operações por fábricas de router. `publicProfileRoutes.ts` limita-se a validar parâmetros, resolver a sessão opcional, chamar as consultas recebidas e traduzir resultados para HTTP. A composição de perfil público fica em `application/publicProfile.ts`; `composition/router.ts` conecta Accounts, Social, Feed e os repositórios de Profiles. A fronteira local application→infrastructure também não possui imports diretos na varredura atual.

### Unidade estrutural concluída: Auth

O módulo Auth tem 50 arquivos TypeScript (33 de aplicação, 16 de apresentação e um de infraestrutura). A camada de apresentação não importa `@workspace/db` nem `drizzle-orm`; a regra é protegida pelo teste `Aplicativo/back/test/auth-presentation-boundary.test.mjs`.

As operações extraídas dos handlers são cadastro/pré-consulta, rotação do token CSRF, listagem/revogação de sessões, listagem/revogação de instalações confiáveis, pedido/confirmação de verificação de e-mail, confirmação/reenvio de código de instalação e pedido/confirmação de atualização/recuperação de senha. Regras de enumeração, mensagens/status, cookies, cooldowns, contagem de tentativas, bloqueios, revogações e atomicidade das transações foram preservados. O inicializador de dados comerciais está em `profiles/infrastructure/initializeCommercialProfile.ts`; Auth o chama durante o cadastro pendente.

O código de aplicação desses fluxos ainda usa Drizzle diretamente para executar suas transações. A separação realizada nesta unidade é entre adaptador HTTP e operação de aplicação; não se declara a criação de um repositório de persistência independente para cada caso de uso, pois isso adicionaria interfaces sem necessidade demonstrada neste recorte. A auditoria posterior de Accounts/Auth e o Gate 2 devem validar se a fronteira de persistência atual permanece sustentável.

### Unidade estrutural concluída: Feed

Feed possui agora 22 arquivos TypeScript distribuídos entre `domain/`, `application/`, `infrastructure/`, `composition/` e `presentation/`. `domain/post.ts` define a forma interna da publicação; `application/ports.ts` define os contratos de persistência e de consulta de autor usados pelos casos de uso. Criar, excluir, ler publicação/artigo, listar conteúdo de perfil e contar publicações recebem suas dependências por composição; `application/` não importa infraestrutura, apresentação, composição, `@workspace/db` ou Drizzle.

`composition/router.ts` conecta os casos de uso aos adaptadores de `infrastructure/postRepository.ts` e às rotas de apresentação. Os routers são construídos com os casos de uso injetados; `presentation/` não importa casos de uso em runtime. `composition/publicApi.ts` fornece a contagem de publicações para Social e uma fábrica explícita para a listagem consumida por Profiles. A consulta de autores é passada como dependência, evitando um ciclo entre Accounts, Social e Feed. Os caminhos em `/v1/social` e os contratos OpenAPI/clientes gerados não mudaram; não foi criada uma identidade paralela de autores.

Foram preservadas a política de privacidade, a ocultação por bloqueio, a mutualidade exigida para Círculo, a paginação estável por `createdAt`/`id`, os limites de leitura, CSRF e a rejeição explícita de mídia ainda não integrada. Nenhuma timeline recomendada ou interação social foi adicionada nesta etapa.

`Aplicativo/back/test/feed-layer-boundary.test.mjs` protege a separação entre aplicação, infraestrutura, apresentação e composição. `feed-application-injection.test.mjs` cobre criação, exclusão, leitura, leitura de artigo e listagem com dependências falsas; os testes existentes preservam regras de visibilidade, cursor e contagens. A suíte de inicialização da API também detectou um ciclo de importação durante a alteração; ele foi removido e a inicialização voltou a passar. Não houve teste de Feed contra banco físico, leitura/escrita no banco ou migration nesta etapa.

### Unidade estrutural concluída: Health

O domínio Health contém três adaptadores de apresentação para composição e endpoints de liveness/readiness, além de um adapter de infraestrutura para o banco. `presentation/readinessRoutes.ts` recebe `checkDatabase` por injeção e converte sucesso/falha em respostas HTTP; `infrastructure/databaseReadiness.ts` executa apenas `SELECT 1`, com o timeout já usado antes; `modules/index.ts` é o composition root que conecta a implementação concreta à rota. A apresentação não importa `@workspace/db` nem Drizzle. Uma camada de aplicação não foi criada: não existe neste fluxo uma regra de negócio ou orquestração que justifique uma função intermediária.

As rotas e respostas continuam iguais: `/healthz` é independente da disponibilidade do banco, `/readyz` retorna `ready` quando a verificação passa e `not_ready` com HTTP 503 em falha, sem divulgar detalhes internos. A suíte agora testa as duas saídas com probe injetado, inclusive que liveness continua `200` quando readiness falha.

**Contrato pendente observado:** o OpenAPI documenta `/healthz`, mas não `/readyz`. A unidade não mudou contratos; a ausência de `/readyz` na especificação permanece identificada para revisão de contrato.

### Unidade estrutural concluída: Onboarding

`presentation/routes.ts` mantém o transporte: exige CSRF, carrega sessão ativa, valida `onboardingCompletionSchema` e preserva o formato de resposta. Agora cria o router recebendo `CompleteOnboarding` como dependência de tipo, sem importar o caso de uso em runtime. `application/completeOnboarding.ts` aplica a regra de que uma etapa pulada salva uma lista vazia e retorna a contagem final; recebe `PersistOnboardingCompletion` por uma porta declarada em `application/ports.ts`, sem importar persistência.

`composition/router.ts` conecta o caso de uso ao repositório e à fábrica de router; `modules/index.ts` monta essa composição. `infrastructure/onboardingRepository.ts` continua mantendo uma única transação para remover interesses anteriores, inserir a nova seleção quando não vazia e atualizar `onboardingCompletedAt` e `updatedAt` somente para conta ativa. A tabela `account_interests` continua no schema de Accounts, ligada por FK à conta; esta unidade não moveu schema nem alterou migrations.

`onboarding-layer-boundary.test.mjs` protege aplicação, apresentação, infraestrutura, composição e ponto de entrada; três testes de injeção cobrem seleção, etapa pulada e propagação de falha de persistência. A suíte `api-isolated-db.test.mjs` inclui cadastro, confirmação, persistência de onboarding e regras sociais no mesmo schema temporário. A tentativa atual, mesmo com a autorização explícita para schema temporário, parou no guard antes de conectar: `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE` não estão configuradas. Não houve conexão nem escrita; a execução anterior aprovada de 5/5 não substitui repetição após a refatoração.

**Contrato verificado:** `POST /v1/onboarding/interests` está descrito em `docs/api/backend/openapi.json` e `docs/api/backend/endpoints.md`; o schema de entrada está em `shared/contracts`. Esta refatoração não alterou nem regenerou o contrato.

### Unidade estrutural concluída: Profiles

O módulo mantém responsabilidades separadas entre `domain`, `application`, `infrastructure`, `presentation` e `composition`. `application/ports.ts` declara os contratos de leitura/escrita usados pelos casos de uso; os repositórios implementam essas portas. A aplicação não importa repositórios próprios nem módulos de composição em runtime. As rotas são construídas por fábricas e recebem operações por parâmetros; `composition/router.ts` liga esses handlers aos casos de uso, à persistência de Profiles e às APIs públicas de Accounts, Social e Feed. O antigo `presentation/routes.ts` foi removido: além da montagem das rotas, ele reexportava funções de Accounts sem consumidores; a montagem agora pertence à composição.

`ownerProfileCommon.ts` compõe a identidade autenticada com o email verificado do titular e as datas de disponibilidade para trocar nome/@. `personalProfile.ts` e `commercialProfile.ts` mantêm as respostas específicas; o carregador comercial verifica os dados obrigatórios antes de responder. `commercialProfileUpdate.ts` e `personalProfileUpdate.ts` preservam regras distintas de edição; `updateOwnerProfile.ts` delega a gravação atômica, cooldowns, reserva do @ e controle de versão ao repositório. Privacidade e disponibilidade de @ também dependem de portas, sem acesso direto à infraestrutura.

As regras de segurança observadas permanecem: `/accounts/me` e suas configurações exigem sessão ativa; PATCH de perfil mantém CSRF e rate limit; a alteração de privacidade mantém CSRF; perfis bloqueados são tratados como não encontrados; o conteúdo privado é avaliado pela política compartilhada de Accounts e pela visibilidade do Feed. O contrato público `PublicAccountRow` e o mapeador de conta não incluem email nem idade; o email verificado aparece somente na resposta autenticada do proprietário. Nenhuma rota, schema de entrada, código de resposta ou regra de negócio foi alterada nesta etapa.

`profiles-presentation-boundary.test.mjs` agora impede imports de banco/infraestrutura na aplicação e apresentação, imports de infraestrutura local na aplicação e imports de casos de uso em runtime pela apresentação; também verifica a composição e o ponto de entrada. Cinco testes novos de injeção cobrem normalização/disponibilidade de @, composição da identidade, bloqueio de leitura comercial em conta pessoal, leitura/conflito de versão de privacidade e encaminhamento da política de atualização. Os testes existentes continuam cobrindo redação de campos privados, bloqueios, acesso de seguidores aprovados, política de Círculo e mapeamento de nomes.

**Limite funcional constatado, não alterado nesta reorganização:** a resposta pública de perfil ainda fornece publicações/artigos e declara `media` como página vazia; não inclui os detalhes comerciais nem a aba de serviços. Também não foi executada integração SQL específica de Profiles. Esses limites são capacidades/API a validar e planejar antes de declarar as páginas públicas prontas, não defeitos que esta reorganização possa corrigir sem ampliar contrato e escopo.

## Domínios e dependências cruzadas

Dependências verificadas entre módulos de backend incluem:

- `accounts` usa serviços de `social` para estatísticas/estado de relações.
- `feed` usa política/consulta de `accounts`.
- `profiles` usa políticas e views públicas de `accounts`, relações de `social` e listagem de conteúdo do `feed`; as dependências são ligadas em `profiles/composition/router.ts`.
- A apresentação de Profiles não agrega esses domínios; handlers recebem as operações já compostas.

As dependências entre esses domínios são explícitas e não acessam tabelas alheias. Testes/build e a inicialização da API verificam a composição em runtime; isso não substitui testes de persistência isolada para os fluxos de Profiles.

## Segurança e comportamento de conta observados

- Política compartilhada de senha: mínimo 8, máximo 128, ao menos maiúscula, minúscula, número e símbolo; hash no backend por Argon2id.
- Cadastro requer conta pessoal ou comercial, idade mínima 18, e-mail e username segundo schema compartilhado.
- Existe verificação de e-mail como condição para autenticação; desafios e dispositivos/sessões estão representados no domínio `security`.
- Sessões usam cookie e defesa CSRF; writes do cliente devem enviar o token CSRF.
- Código de dispositivo confiável é ligado a instalação, revogável por conta, e revogação está disponível pela API.
- Erros têm contrato `{ error: { code, key, message, requestId, ... } }`; status HTTP é transporte e não substitui o código numérico único de domínio.
- Limites de corpo JSON e logging/request id estão configurados no app. Nenhum segredo foi lido ou escrito para esta auditoria.

Estes pontos descrevem implementação encontrada e não significam auditoria de segurança formal, teste de penetração ou aprovação regulatória.

## Cobertura funcional da API

### Presente na API

- cadastro/login/verificação de e-mail e dispositivo;
- sessão atual, logout, lista/revogação de sessões/dispositivos;
- atualização/recuperação de senha e alteração de e-mail;
- onboarding de interesses;
- leitura/atualização de dados da conta e configurações de privacidade;
- perfis público/próprio e disponibilidade de username;
- relações sociais (seguir, aceitar/recusar pedido, bloquear/desbloquear, listas e círculo);
- publicação de texto/artigo em primeira etapa.

### Não comprovado como completo/ligado

- operações completas de comentários, curtidas, repostagens, feed de recomendação e upload/durabilidade de mídia;
- persistência de eventos, avaliações do Seek, catálogo/ordens/checkout do Shop;
- armazenamento durável de mídia, fila, cache e notificações externas;
- execução de migrações no banco real deste ambiente;
- integração operacional dos domínios `messages`, `notifications`, `shop`, `media`, `location`, `search` e `trust_safety`.

O pacote de banco tem schemas reservados para esses domínios, mas schema reservado não é implementação de endpoints nem integração ativa.

## Testes de backend e banco

Na validação da unidade Onboarding, `pnpm test` passou em 100 casos, o typecheck completo e o build da API passaram. Testes de fronteira protegem Auth, Feed e Onboarding contra acesso direto à persistência nas camadas que não a possuem; Health também mantém a consulta fora da apresentação. A suíte de runtime observou `/api/healthz` e `/api/readyz` responderem 200 neste ambiente; o teste isolado de Health também cobre a resposta 503 sem necessidade de banco.

Em 28/10/2026, a suíte foi executada com `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1` e o nome de destino previamente confirmado `heliumdb`. Resultado: 5/5; criou um schema `seekalive_test_<UUID>`, executou a API real contra tabelas temporárias, capturou os e-mails em memória, removeu o schema no `after` e preservou o fingerprint do schema `public`. Uma consulta posterior confirmou zero schemas temporários e os mesmos 12 objetos de tabela nos quatro schemas de aplicação. `RESEND_API_KEY` foi removida no processo do teste; nenhuma mensagem real foi enviada.

O arquivo `Aplicativo/back/test/api-isolated-db.test.mjs` tem 2.640 linhas e cinco cenários grandes que cruzam Auth, Accounts, Onboarding e Social. A execução prova os fluxos API+DB incluídos, não a integração do frontend; a suíte não faz parte de `pnpm test` e requer o comando explícito `test:api-isolated-db`. O tamanho e a concentração de cenários continuam como oportunidade de modularização: devem ser avaliados sem quebrar a fixture compartilhada nem alterar o comportamento dos testes.

## Reconciliação arquitetural final — 28/10/2026

- A análise AST cobriu 213 arquivos TypeScript em `Aplicativo/back/src`: zero ciclos de importação e zero arquivos contendo somente reexports.
- `src/security/request-origin.ts` e `src/security/session.ts` foram removidos porque não tinham responsabilidade própria além de reexportar símbolos de outros módulos. A taxa de limite, IP confiável, CSRF, sessão ativa, configuração/cookies e hashing continuam em seus módulos proprietários; os consumidores importam diretamente deles.
- A mudança alcançou os fluxos de Auth, Feed, Onboarding, Profiles e Social, bem como testes de Auth e de fronteiras. Os testes não encontraram imports restantes desses agregadores.
- A busca nas camadas `application` e `presentation` não encontrou imports de `@workspace/db` ou `drizzle-orm`. Os adaptadores e consultas continuam nas camadas de infraestrutura/composição já existentes.
- Nenhum endpoint, schema, migration, regra de negócio, política de segurança ou dado persistido foi alterado. A suíte completa (`pnpm test`), o build completo (`pnpm build`), Prettier e `git diff --check` passaram após a mudança.
- Após reiniciar o workflow da API, o servidor escutou na porta 8080; `/api/healthz` e `/api/readyz` retornaram 200. A raiz `/` retorna 404 com o contrato `NOT_FOUND`, pois a API não hospeda o frontend nessa rota; isso não impediu a inicialização nem os endpoints de saúde.

Esta reconciliação comprova os critérios estáticos e de build descritos acima; não substitui os testes SQL específicos ainda registrados para Feed e Profiles nem afirma que os módulos funcionais não iniciados estão prontos.

## Atualização — API real de exclusão/restauração — 29/10/2026

`Aplicativo/back/test/account-deletion-api-isolated.test.mjs` percorre cadastro, verificação de e-mail, obtenção de sessão, pedido e confirmação de exclusão, login durante o prazo e restauração por HTTP contra a API real. O teste usa schema temporário com a fixture protegida por opt-in e banco esperado; os códigos de e-mail são coletados em memória, sem Resend. Verifica que a rota exige sessão, que a conta fica em `deletion_pending` por sete dias, que a sessão é revogada, que o perfil público retorna 404 enquanto a exclusão está agendada, que código inválido não restaura, e que a restauração limpa o agendamento, torna o perfil público novamente disponível e não emite sessão. A suíte `test:account-deletion` passou em 4/4; a fixture confirmou remoção do schema e preservação do schema `public`. O teste de ciclo também confirmou que uma segunda execução do finalizador não repete a exclusão.

Essa evidência fecha a validação de API autenticada solicitada para este subfluxo, mas não combina frontend e API real no mesmo navegador: o teste de UI existente continua usando API simulada. O worker de exclusão é iniciado pelo ponto de entrada da API e roda imediatamente e depois em intervalo de um minuto; a chamada de finalização e a idempotência também são verificadas em teste isolado. Gate 2 segue aberto até a segunda revisão independente de Accounts/Auth. Feed, Mensagens e Mídias sem persistência continuam fora da alegação de limpeza completa.
