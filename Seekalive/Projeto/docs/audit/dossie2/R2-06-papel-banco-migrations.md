# R2-06 — Papel efetivo do banco e estado dos ledgers

**Status da rodada original:** consulta de catálogo somente-leitura concluída pelo pool exportado do mesmo módulo de conexão usado pelo backend. Nenhuma linha de dados de aplicação foi lida; nenhuma migration, DDL ou escrita foi executada naquela rodada.

## Atualização posterior — reconciliação de Reviews em desenvolvimento — 31/10/2026

Após autorização expressa do proprietário para DDL exclusivamente no banco de desenvolvimento, `profiles/0003_misty_rhodey.sql` foi validada em schemas temporários transacionais e aplicada somente ao banco `heliumdb` pela trilha Profiles. A consulta de catálogo posterior confirma `profiles.business_profile_reviews`, quatro checks, duas FKs `ON DELETE CASCADE` e quatro índices contando a PK; o ledger Profiles passou de três para quatro registros. O replay de migrations em schema temporário e `drizzle-kit check` passaram. Nenhuma linha de negócio foi consultada, produção não foi acessada e o teste não comprova o funcionamento ponta a ponta das rotas de Reviews. Assim, o achado R2-06-003 abaixo permanece como evidência histórica da rodada original, mas sua pendência estrutural está resolvida.

## Alvo e método

- `infra/database/src/index.ts` instancia o pool de runtime com `resolveDatabaseConnectionUrl(process.env, "runtime")`.
- Na execução observada, `SEEKALIVE_DATABASE_TARGET` não estava definido; o resolvedor aplica o padrão `replit` e usa `DATABASE_URL`. O alvo não era `external`; `REPLIT_DEPLOYMENT` estava ausente e a execução foi explicitamente marcada como desenvolvimento.
- A consulta foi executada pelo `pool` desse módulo, não por uma conexão alternativa montada para a auditoria.
- `experimentos/database-role-probe.mjs` transpila o módulo em memória e executa somente consultas a `pg_roles`, `pg_namespace` e `pg_tables`. A saída contém apenas flags e contagens agregadas; não imprime nome do banco, usuário, schema, tabela, URL ou credenciais.
- Escopo de leitura da consulta: flags do role atual; ownership/`CREATE` de schemas não sistêmicos; contagem e privilégios agregados de tabelas não sistêmicas. Nenhum `SELECT` em tabelas de domínio.

## Resultado do papel de runtime

| Capacidade | Resultado observado |
|---|---:|
| É superusuário | Sim |
| Pode criar banco | Sim |
| Pode criar roles | Sim |
| Pode ignorar Row-Level Security | Sim |
| Pode conectar | Sim |
| Schemas não sistêmicos observados | 14 |
| Possui ao menos um schema não sistêmico | Sim |
| Pode criar em ao menos um schema não sistêmico | Sim |
| Pode remover ao menos um schema (ownership/superuser) | Sim |
| Tabelas não sistêmicas observadas | 28 |
| Tabelas não sistêmicas cujo owner é o role atual | 28 |
| Privilégio agregado em todas essas tabelas | `SELECT`, `INSERT`, `UPDATE`, `DELETE` e `TRUNCATE` |
| Pode executar `TRUNCATE` em ao menos uma tabela | Sim |
| Outra role de login sem privilégios administrativos | 0 |

### R2-06-001 — Credencial de runtime tem privilégios administrativos totais

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `node docs/audit/dossie2/experimentos/database-role-probe.mjs` no pool runtime de desenvolvimento retornou `superuser=true`, `createdb=true`, `createrole=true`, `bypassrls=true`, ownership de 28 tabelas não sistêmicas e ausência de outra role de login não administrativa (detalhes agregados neste relatório, linhas 17-30).
- **Risco:** Alto — se o processo de API for comprometido no ambiente observado, sua credencial permite administrar estruturas e contornar RLS; isso descreve somente o banco de desenvolvimento atual.

## Estado dos ledgers de migration

Foram lidas exclusivamente as colunas `id`, `hash` e `created_at` das tabelas de ledger indicadas pelo roteiro. Os hashes retornados foram comparados localmente com os arquivos SQL; os valores brutos não são reproduzidos neste relatório.

| Trilha | Registros no ledger | Comparação com os arquivos SQL locais |
|---|---:|---|
| Accounts | 2 | Os dois registros correspondem aos dois SQLs locais aplicados. |
| Security | 1 | Corresponde ao baseline local. |
| Profiles | 3 | Os três primeiros SQLs locais correspondem. Há um quarto SQL local sem registro correspondente no ledger; ele não foi aplicado. |
| Feed | 4 | Os quatro SQLs locais correspondem. |
| Media | 1 | Corresponde ao baseline local. |
| Seek | 1 | Corresponde ao baseline local; não há fonte de backend Seek a validar funcionalmente nesta etapa. |

O ledger legado `drizzle.__drizzle_migrations` não existe. Os sete SQLs/snapshots da trilha combinada antiga permanecem em `infra/database/migrations/` na raiz, mas o config atual gera/migra somente `accounts`, `security`, `profiles`, `feed` e `media`; o diretório histórico não aparece como destino ativo.

## Comparação do snapshot original com o catálogo de desenvolvimento

O probe comparou os snapshots mais recentes por domínio, tabelas/colunas presentes, tipo, comprimento varchar, nulabilidade, default e existência por nome de índices, FKs, checks e constraints únicas. Não leu linhas de aplicação nem executou DDL.

| Comparação | Resultado |
|---|---|
| Tabelas esperadas nos seis snapshots de domínio | 24 |
| Tabelas de aplicação no catálogo (excluindo `drizzle` e schemas do sistema) | 22 |
| Tabelas inesperadas | 0 |
| Tabelas ausentes | `profiles.business_profile_reviews`, `seek.business_profiles` |
| Colunas divergentes em tabelas existentes | Oito colunas de apresentação removidas de `accounts.accounts`; explicação abaixo |
| Tipo/comprimento/null/default das demais colunas existentes | Correspondem aos snapshots |
| Índices/FKs/checks ausentes em tabelas existentes | Nenhum; os nomes ausentes pertencem às duas tabelas ausentes |
| Hashes locais das migrations aplicadas | Correspondem em ordem aos registros aplicados em cada trilha |

**Accounts/Profiles:** `profiles/0002_charming_alice.sql` copia os campos de apresentação de `accounts.accounts` para `profiles.account_profiles` e depois remove oito campos de Accounts. A tabela real de Accounts corresponde ao schema-fonte atual (`infra/database/src/schema/accounts/schema.ts`), mas `accounts/meta/0001_snapshot.json` e o SQL de baseline ainda descrevem os oito campos antigos. Não há migration posterior na trilha Accounts que registre essa mudança; a alteração foi feita pela migration de Profiles. Assim, `drizzle-kit check` passa a cadeia de snapshots sem identificar essa divergência entre o snapshot Accounts e o estado após executar todas as trilhas.

**Profiles:** na leitura original, o relatório não declarou presença física de Reviews. A migration pendente foi aplicada posteriormente; o estado atual de tabela, índices, FKs e checks está em `docs/api/backend/development-database-catalog-2026-10-31.md` e deve ser renovado pela consulta `docs/api/backend/queries/development-database-catalog.sql`.

**Seek:** há uma migration e um ledger `seek_migrations` com hash correspondente, mas `seek.business_profiles` está ausente no catálogo. Ao mesmo tempo, `migrationTrackConfig.ts:4-30` não inclui Seek entre as trilhas aceitas e `infra/database/Aplicativo/db check` não verifica Seek. O ledger marca a migration como aplicada enquanto o objeto criado por ela falta; não foi possível determinar somente com esta leitura se a tabela foi removida manualmente, restaurada de estado incompleto ou se o ledger foi criado fora do fluxo atual.

**Limite de comparação:** a verificação compara existência/nome dos índices e constraints e estrutura de colunas, não igualdade semântica integral das expressões SQL de cada índice/check/FK. Não foi usada ferramenta de diff que execute DDL; essa igualdade semântica fica não verificada.

### R2-06-002 — Snapshot de Accounts não registra a remoção executada pela trilha Profiles

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** a migration `profiles/0002_charming_alice.sql:17-52` copia e remove campos de `accounts.accounts`; o schema atual Accounts omite esses campos, mas `accounts/meta/0001_snapshot.json` ainda os lista. A trilha Accounts tem apenas duas migrations, sem registro próprio da mudança.
- **Risco:** Médio — reexecução/geração futura da trilha Accounts pode propor alteração já aplicada por Profiles e faz `drizzle-kit check` passar sem refletir o estado combinado do banco.

### R2-06-003 — Tabela de avaliações comerciais está prevista, mas migration local não foi aplicada

- **Rodada 1:** novo
- **Veredito na auditoria original:** CONFIRMADO.
- **Atualização posterior:** **resolvido estruturalmente em desenvolvimento**. O ledger Profiles tinha três entradas; a migration `0003_misty_rhodey.sql` foi aplicada pela trilha correta e o catálogo posterior confirmou a tabela e seus objetos. Ver a atualização no início deste relatório e o catálogo datado.
- **Limite restante:** a migration e a presença física da tabela não comprovam a execução funcional autenticada das rotas de Reviews. Esse comportamento não foi validado nesta reconciliação.

### R2-06-004 — Ledger Seek afirma aplicação, mas a tabela esperada não existe

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `seek_migrations` possui um registro cujo hash corresponde a `seek/0000_baseline.sql`; o catálogo não contém `seek.business_profiles`. A trilha Seek também não consta em `migrationTrackConfig.ts`.
- **Risco:** Médio — a trilha ainda não está ativa no `check` e o ledger diverge do catálogo; qualquer integração Seek futura que dependa da tabela pode falhar ao iniciar.

### R2-06-005 — Igualdade semântica integral das constraints não foi verificada

- **Rodada 1:** novo
- **Veredito:** NÃO VERIFICADO
- **Evidência:** o método registrado neste relatório (`R2-06-papel-banco-migrations.md:55-57,76`) comparou presença/nome de índices, FKs, checks e constraints únicas, não igualdade de expressão SQL, predicados, ações `ON DELETE` ou demais opções semânticas.
- **Risco:** Informativo — nenhuma divergência semântica foi confirmada, mas a validação feita não permite declarar equivalência integral do catálogo com todos os snapshots.

## Ações fora do escopo desta auditoria

1. Separar uma credencial de runtime de desenvolvimento com privilégios mínimos da identidade de migrations.
2. Alinhar ownership e snapshots Accounts/Profiles sem repetir remoções destrutivas.
3. **Concluído posteriormente:** reconciliar a migration Profiles pendente no banco de desenvolvimento por fluxo próprio autorizado; a rodada original não executou essa ação.
4. Recuperar a consistência de Seek e adicionar a trilha ao `check` somente na etapa de domínio aprovada.
5. Comparar definições semânticas de índices/constraints/FKs em uma validação read-only dedicada antes de declarar equivalência.

`drizzle-kit check` passou para cinco trilhas; a configuração/comando de check não inclui Seek. Esse limite e a ausência de suíte funcional Seek já estão apontados em R2-01 e R1-14-006; não se reapresentam como achados independentes aqui.

## Proteções e limites

- Na rodada original, nenhuma migration foi aplicada; a migration Profiles pendente foi aplicada somente na atualização posterior registrada no início deste documento.
- Nenhum teste que crie schema foi executado.
- O script aborta se `REPLIT_DEPLOYMENT` estiver presente, se `NODE_ENV` não for `development` ou se o alvo de runtime estiver explicitamente configurado como `external`.
- O script não imprime URL, nome de role/banco/schema/tabela, nem lê dados de contas.
- A alta capacidade do role é uma propriedade observada da credencial de desenvolvimento atual, não autorização para operar catálogo. Nenhuma alteração foi feita.

## R2-06 — Fechamento

- **Achados novos:** 5 (1 alto, 3 médios, 1 informativo/não verificado).
- **Ledgers comparados:** seis trilhas, somente metadados de ledger e hashes locais.
- **Migrations/DDL/escritas:** nenhuma.
- **Dados de usuário:** nenhum lido.
