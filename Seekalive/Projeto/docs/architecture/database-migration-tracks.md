# Histórico de migrations por domínio

**Status:** ativo no ambiente de desenvolvimento. O projeto ainda não foi lançado; produção não foi acessada.

## Decisão

As migrations seguem tracks independentes por domínio, cada uma com:

- SQL e journal próprios em `infra/database/migrations/<domínio>/`;
- configuração de geração e aplicação que aceita somente um domínio ativo por execução;
- tabela de histórico exclusiva em `drizzle.<domínio>_migrations`.

Tracks ativos nesta etapa:

| Track      | Schema lógico | Ledger                        | Dependência de criação |
| ---------- | ------------- | ----------------------------- | ---------------------- |
| `accounts` | `accounts`    | `drizzle.accounts_migrations` | primeira               |
| `security` | `security`    | `drizzle.security_migrations` | `accounts`             |
| `profiles` | `profiles`    | `drizzle.profiles_migrations` | `accounts`             |
| `seek`     | `seek`        | `drizzle.seek_migrations`     | `accounts`             |
| `feed`     | `feed`        | `drizzle.feed_migrations`     | `accounts`             |
| `media`    | `media`       | `drizzle.media_migrations`    | `accounts`             |

O PostgreSQL continua compartilhado no desenvolvimento. Separar o histórico de migrations não cria bancos físicos independentes nem muda o ownership dos dados. `accounts` é a origem da identidade; os outros domínios mantêm suas tabelas e podem usar FKs já aprovadas para essa identidade.

## Baselines e estado reconciliado

O histórico combinado antigo, `infra/database/migrations/0000`–`0006`, foi mantido como registro histórico e não é mais o caminho executável do pacote. Ele não deve voltar a ser usado por `drizzle-kit migrate`; Feed e Mídias seguem trilhas independentes.

Foram criados baselines independentes para `accounts`, `security`, `profiles`, `seek` e `media`; Feed tem baseline e migration de evolução próprias. Eles representam os objetos existentes, incluindo a alteração de exclusão da conta aplicada anteriormente por `0006`. O SQL cria cada schema quando o banco estiver vazio e mantém FKs para Accounts nos domínios dependentes.

**Levantamento histórico de 29/10/2026:** no banco de desenvolvimento `heliumdb`, a verificação read-only confirmou que:

- as 12 tabelas desses quatro domínios existem e estavam vazias;
- tabelas, colunas, defaults, constraints, FKs e índices correspondem aos baselines;
- `feed.posts` ainda estava ausente naquele momento;
- não havia ledger anterior.

Na reconciliação de 29/10, o schema de infraestrutura `drizzle` recebeu um ledger por track então existente. O estado abaixo é histórico; as migrations posteriores de Feed e Mídias foram aplicadas em 30/10, conforme atualização atual.

**Estado atual de desenvolvimento — 30/10/2026:** `feed.posts` existe com a coluna `media`; `media.assets` existe no schema próprio. Foram aplicadas `feed/0001_robust_solo.sql` e `media/0000_baseline.sql`, com hashes e timestamps conferidos nos ledgers correspondentes. A contagem confirmada é Accounts 4, Security 4, Profiles 5, Seek 0, Feed 6 e Mídias 1 (20 tabelas no total). Nenhuma produção foi consultada ou alterada.

## Comandos e proteções

- Gerar SQL: `pnpm --filter @workspace/db run generate:accounts`, `generate:security`, `generate:profiles`, `generate:seek`, `generate:feed` ou `generate:media`.
- Verificar todos os journals ativos: `pnpm --filter @workspace/db run check`.
- Reexecutar os quatro baselines em schemas descartáveis: `NODE_ENV=test SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 SEEKALIVE_EXPECTED_DATABASE="$PGDATABASE" SEEKALIVE_DB_MIGRATION_TARGET=replit pnpm --filter @workspace/db run test:baselines`.
- Aplicar uma mudança revisada a um único domínio: definir explicitamente `SEEKALIVE_DB_MIGRATION_TARGET=replit` e executar `migrate:accounts`, `migrate:security`, `migrate:profiles`, `migrate:seek`, `migrate:feed` ou `migrate:media`.
- Inicializar um banco de desenvolvimento vazio: `SEEKALIVE_DB_MIGRATION_TARGET=replit pnpm --filter @workspace/db run migrate:baseline`. O script aplica os tracks na ordem definida pelo pacote, respeitando Accounts antes dos domínios dependentes.
- `push` é restrito a schema temporário de teste e não é o fluxo de desenvolvimento principal.
- O pós-merge verifica os journals; não aplica `push` nem executa migrations automaticamente.

O replay descartável validou os quatro SQLs reais numa única transação: 12 tabelas, 91 colunas, 15 FKs, 5 checks de negócio e 28 índices. Os schemas temporários foram removidos antes do commit. O teste também detectou e levou à correção de expressões PostgreSQL inválidas que qualificavam colunas de `CHECK` e do índice parcial com schema/tabela.

Replay automatizado de todos os baselines em schemas descartáveis e o teste integrado de purga da conta com mídia não foram executados pelo shell nesta etapa: `DATABASE_URL` e `SEEKALIVE_EXPECTED_DATABASE` não estão disponíveis no processo. A aplicação e a verificação dos objetos Feed/Mídias foram feitas diretamente no banco de desenvolvimento. `Shop` está fora do escopo.

## Critérios para mudanças futuras

1. Cada migration nova pertence ao domínio proprietário e altera somente objetos sob seu ownership.
2. Toda migration é gerada, revisada e testada antes de ser aplicada; nunca editar o ledger para esconder SQL não aplicado.
3. Migrations que referenciem Accounts dependem da execução prévia do track `accounts`.
4. Mudanças de contrato entre domínios devem ser acompanhadas por revisão das FKs, composição de aplicação, testes e documentação.
5. O comando de aplicação sempre declara ambiente e track; validação local do journal não é prova de aplicação física.
6. Produção permanece fora da etapa atual e não é alvo de qualquer comando descrito aqui.
