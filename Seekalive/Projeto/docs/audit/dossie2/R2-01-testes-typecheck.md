# R2-01 — Scripts, testes, typecheck e trilhas de migration

**Status:** revisão estática concluída; typecheck e checagens locais executados; suítes de teste não executadas por bloqueio obrigatório de isolamento.  
**Limite:** nenhum teste, migration, `push`, seed ou escrita em schema real foi executado. Nenhuma falha de teste é inferida como aprovação.

## Inventário de comandos

| Área | Comandos relevantes identificados | Papel e cobertura observada |
|---|---|---|
| Raiz | `typecheck`, `typecheck:libs`, `test`, `test:social`, `test:account-deletion`, `build` | `typecheck` compila libs e executa typecheck dos pacotes de Aplicativo, shared, infra, scripts e artifacts. `test` agrega testes sociais, backend e testes Node; não inclui explicitamente `seekDiscovery.test.ts`, `test:baselines` nem os E2E do frontend. |
| `scripts` | `test:security-boundaries`, `test:api-runtime`, `test:db-connection`, `test:db-domain-registry`, `test:api-isolated-db`, `test:accounts-deletion-schema`, `test:accounts-deletion-policy`, `test:feed-global`, `test:media-storage`, `test:profiles-reviews`, `test:backend` | Testes de limites de segurança, runtime, registro de domínios, integração API isolada e políticas dos domínios. `test:backend` agrega subconjuntos; comandos de teste DB precisam de isolamento demonstrável. |
| Backend | `typecheck`, `build`; arquivos Node de exclusão no alvo `test:account-deletion` | A suíte de exclusão é composta por teste de schema, lifecycle e API isolada. O backend não possui comando genérico próprio de teste que cubra todo o domínio Auth. |
| Frontend | `typecheck`, `build`, `serve`, `test:e2e:auth`, `test:e2e:auth:registration:integration`, `test:e2e:auth:sessions:integration`, `test:e2e:auth:reset:integration`, `test:e2e:auth:credential-changes:integration` | `auth` mocka API; quatro variantes `integration` iniciam uma API de teste ligada a schema isolado. Os testes E2E não fazem parte de `pnpm test` na raiz. |
| Banco | `check`, `test:baselines`, `generate:*`, `migrate:*`, `push:*` | `check` valida os journals de Accounts, Security, Profiles, Feed e Media. `test:baselines` cria schemas temporários; `generate`, `migrate` e `push` são mudanças ou geração de estado e não foram executados. |
| Teste fora do agregador | `Aplicativo/front/tests/seekDiscovery.test.ts` | Teste unitário de descoberta, com `fetch`/session storage simulados; não há script package dedicado que o inclua no `pnpm test` da raiz. |

## Pré-voo obrigatório de isolamento

| Requisito | Evidência | Resultado |
|---|---|---|
| Schema aleatório `seekalive_test_<32 hex>` criado e usado | `scripts/test-support/isolatedDatabaseFixture.mjs:30-36,111-220` gera o nome com UUID aleatório, cria o schema isolado, executa o alvo de migration de teste, valida o isolamento e tenta remover o schema criado. | **Comprovado** para fixture de integração. |
| `NODE_ENV=test`, `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_DB_SCHEMA`, `SEEKALIVE_DB_MIGRATION_TARGET`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS` | `isolatedDatabaseFixture.mjs:43-70,118-122` aplica as guardas e configura o schema/target antes do teste. | **Guardas implementadas; variáveis necessárias não estão todas presentes no shell atual.** |
| Recusa de produção (`REPLIT_DEPLOYMENT`) | `isolatedDatabaseFixture.mjs:43-53`; `infra/database/scripts/test-migration-baselines.mjs:8-21` | **Comprovado** no código de fixture. O marcador de deployment não está presente neste shell; nenhum valor de conexão foi mostrado. |
| Adaptador de e-mail falso, sem envio Resend | `Aplicativo/back/src/modules/auth/infrastructure/emailDelivery.ts:19-34` permite injeção apenas em `NODE_ENV=test`; testes de API isolada configuram esse adaptador antes de importar a aplicação. `authRegistrationBrowserServer.mjs` usa adaptador de teste; o fixture remove credenciais Resend do processo filho. | **Comprovado para os testes de fluxo Auth que realmente enviam e-mail.** Testes sem envio não importam/callam a entrega real. |
| Schema `seekalive_test_%` antes dos testes | Consulta de catálogo de desenvolvimento, filtrada apenas por `information_schema.schemata` | **Nenhum schema encontrado.** |
| Schema `seekalive_test_%` após os testes | Não houve execução de testes; nova consulta de catálogo após este registro | **Nenhum schema criado por esta auditoria; nenhum cleanup foi tentado.** |

Variáveis de ambiente consultadas foram reportadas somente como presentes/ausentes: `DATABASE_URL` está presente; `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS`, `SEEKALIVE_DB_SCHEMA` e `SEEKALIVE_DB_MIGRATION_TARGET` estão ausentes. O segredo Resend está presente, mas não foi lido nem exposto. Não preenchi guardas faltantes com valores inferidos.

### Suítes e estado de execução

| Comando/suíte | Resultado | Motivo específico |
|---|---|---|
| `pnpm test` | **NÃO EXECUTADO** | O pré-voo não está satisfeito: faltam a identidade de banco esperada e o opt-in obrigatório; o agregado combina suites diferentes e `test:social` escreve em `os.tmpdir()` se `TMPDIR` não for redirecionado para a pasta permitida. |
| `pnpm test:account-deletion` | **NÃO EXECUTADO** | Suíte de integração com schema de teste; guardas ausentes. |
| `test:accounts-deletion-policy` | **NÃO EXECUTADO** | O arquivo observado é puro e sem acesso ao banco, mas não executei nenhuma suíte antes de concluir o pré-voo global exigido pelo prompt. |
| `test:accounts-deletion-schema` e `test:accounts-deletion-api-isolated` | **NÃO EXECUTADOS** | Criam/consomem schema de teste; guardas ausentes. |
| `test:baselines` | **NÃO EXECUTADO** | Requer banco/opt-in. Além disso, cria nomes `seekalive_test_<32 hex>_<track>`, diferentes do padrão exato exigido pelo roteiro, e não usa a mesma variável de schema da fixture; precisa de revisão antes de ser considerado conforme ao protocolo de isolamento. |
| `test:e2e:auth` | **NÃO EXECUTADO** | API mockada, mas exige E2E/browser; o roteiro exige prova de isolamento e não autoriza iniciar/reiniciar workflow. |
| `test:e2e:auth:*:integration` (4 suites) | **NÃO EXECUTADAS** | API filha usa fixture isolada, mas as guardas necessárias não foram disponibilizadas. |
| `seekDiscovery.test.ts` | **NÃO EXECUTADO** | Fora do agregado padrão; o pré-voo global não foi liberado. |
| Demais suites de domínio do pacote `scripts` | **NÃO EXECUTADAS** | Nenhuma suíte foi iniciada antes de satisfazer o protocolo global do prompt. |

Não foram coletados contadores de testes, duração ou primeira falha para suites não executadas; registrá-los seria inventar resultados.

## Verificações executadas sem executar testes

| Comando | Resultado | Duração medida |
|---|---:|---:|
| `pnpm run typecheck` | exit 0; pacotes de scripts, sandbox, backend e frontend concluíram | 17,609 ms |
| `pnpm --filter @workspace/db run check` | exit 0; cinco tracks reportaram `Everything's fine` | 6,009 ms |
| `pnpm audit --prod` | exit 0; nenhuma vulnerabilidade conhecida reportada pelo audit da execução | 827 ms |

O `check` atual cobre cinco tracks e não inclui Seek. Isso não prova que a trilha Seek esteja aplicada ou sem drift.

## Comparação com afirmações documentais anteriores

- `docs/api/backend/README.md:5` registra uma rodada anterior com suíte geral, exclusão, baselines, typecheck, build e geração/verificações concluídas. Nesta rodada, apenas o typecheck e `db check` foram reproduzidos; nenhuma suíte, replay, geração ou build foi executado aqui. A afirmação histórica não é reutilizada como evidência da rodada atual.
- `docs/architecture/database-migration-tracks.md:53-55` registra resultados e limitações de uma execução anterior. A consulta atual dos ledgers e hashes dos SQLs é evidência nova e está registrada em R2-06; o replay atual continua não executado.

## Achados

### R2-01-001 — Suítes não liberadas pelo pré-voo

- **Rodada 1:** novo
- **Veredito:** NÃO EXECUTADO
- **Evidência:** faltam as guardas de ambiente listadas em `scripts/test-support/isolatedDatabaseFixture.mjs:43-70`; por isso nenhuma suíte de teste foi iniciada.
- **Risco:** Informativo — sem resultados atuais de unit/integration/E2E, esta rodada não pode declarar o backend validado por testes.

### R2-01-002 — Baseline de migration usa nomenclatura de schema fora do protocolo

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `infra/database/scripts/test-migration-baselines.mjs:132-206` compõe nomes por trilha; a fixture comum usa `seekalive_test_<32 hex>` em `scripts/test-support/isolatedDatabaseFixture.mjs:30-36`.
- **Risco:** Baixo — a suíte de baseline não prova o contrato de isolamento exigido e não foi executada.

### R2-01-003 — `seekDiscovery.test.ts` fora do comando padrão

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `Aplicativo/front/tests/seekDiscovery.test.ts` existe, mas não há script correspondente no manifest do frontend nem inclusão no agregado padrão `pnpm test`.
- **Risco:** Baixo — regressões de descoberta podem ficar fora da validação padrão.

## Ações fora do escopo desta auditoria

1. Disponibilizar as guardas de teste pelo fluxo seguro e refazer o pré-voo antes de qualquer suíte que possa escrever.
2. Uniformizar o nome/guarda do schema temporário em `test:baselines`.
3. Incluir `seekDiscovery.test.ts` em um comando de teste explícito e na validação padrão.

## Resumo R2-01

- **Achados novos:** 3 (0 críticos, 0 altos, 0 médios, 2 baixos, 1 informativo/não executado).
- **Testes:** 0 executados; todas as suites estão identificadas e marcadas como não executadas.
- **Validações não-testes:** typecheck, `drizzle-kit check` e `pnpm audit --prod` passaram.
- **Schemas temporários:** zero antes; zero depois; sem limpeza manual.
