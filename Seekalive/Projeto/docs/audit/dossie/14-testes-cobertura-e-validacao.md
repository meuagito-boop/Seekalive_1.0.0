# 14 — Testes, cobertura e validação

## Limite desta etapa

Este bloco é um inventário estático dos arquivos e scripts de teste. Não executa `pnpm test`, testes isolados, typecheck, lint, build, codegen, migrations, servidor ou browser. Portanto, não atesta que qualquer teste passa hoje.

## Achados

### 14-001 — Há testes unitários e de integração distribuídos pelo front, backend e banco

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** inventário por `find` encontrou 40 arquivos de teste em `Aplicativo/back/test`, 21 em `Aplicativo/front/tests` e 1 em `infra/database/test`. Os testes do backend abrangem autenticação, cadastro, segurança de sessão/dispositivo, exclusão de conta, Profiles, Social, Feed, Media e limites de camada. O frontend inclui testes de API, estado, telas e 5 fluxos E2E de autenticação.

**Trecho da saída:** `40`, `21`, `1`; arquivos nomeados como `auth-registration-injection`, `feed-visibility`, `profilePresentation` e `authFlows.e2e`.

### 14-002 — O comando padrão não inclui a suíte dedicada de exclusão de conta

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `package.json:11` define `test:account-deletion` separadamente. O `test` padrão (`package.json:12`) não chama esse script. A suíte de exclusão também inclui `account-deletion-policy.test.mjs`, exposta como `test:accounts-deletion-policy` em `scripts/package.json:14`, mas ausente de `scripts/package.json:18` (`test:backend`). Assim, a existência dos testes não significa que a rotina geral os execute.

**Trecho:** script isolado de exclusão é declarado na linha 11; o `test` padrão encadeia `test:social`, `test:backend` e uma lista explícita de outros arquivos, sem incluir os três testes isolados nem a policy.

**Impacto:** a automação de validação precisa dizer explicitamente quais suites compõem o “teste completo”; hoje há suites que só executam por comando separado.

### 14-003 — Os testes E2E do frontend são separados e dependem da aplicação/browser de teste

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `Aplicativo/front/package.json:11–15` oferece cinco scripts `test:e2e:*`, mas não são chamados pelo `test` da raiz. `tests/e2e/authFlows.e2e.test.mjs:1–18` importa utilitários de browser e chama `verifyLocalAppIsRunning()` antes de iniciar o navegador.

**Trecho:** `await verifyLocalAppIsRunning(); browser = await launchAuthTestBrowser();`.

**Impacto:** estes testes precisam de um ambiente de preview controlado e não devem ser confundidos com testes unitários sem browser.

### 14-004 — A busca de locais possui teste que não está ligado ao runner padrão do frontend

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `Aplicativo/front/tests/seekDiscovery.test.ts` existe. A lista explícita de entradas de `scripts/test-social.mjs:13–28` não inclui esse arquivo; `Aplicativo/front/package.json:6–15` não define script unitário para ele. Não foi encontrado vínculo em outro script padrão.

**Trecho:** a lista `testEntries` inclui 15 testes de frontend e não contém `seekDiscovery.test.ts`.

### 14-005 — O executor de testes sociais compila temporariamente os testes antes de rodá-los

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `scripts/test-social.mjs:11–12,30–53` cria uma pasta temporária, empacota entradas TypeScript com esbuild, executa `node --test` e remove a pasta em `finally`. É uma execução de teste com artefatos temporários, não uma simples descoberta automática de todos os arquivos.

**Trecho:** `mkdtemp(...)`; depois `spawnSync(process.execPath, ["--test", ...testFiles])`; por fim `rm(directory, { recursive: true, force: true })`.

### 14-006 — O escopo executável de testes do Feed existe; o backend de Seek ainda não tem suite

**Veredito:** PARCIAL  
**Prioridade:** Informativa para Feed; esperada para Seek ainda não implementado

**Evidência:** existem testes de Feed para visibilidade, contagens, listagem, hashtags e injeção de dependências (`Aplicativo/back/test/feed-*.test.mjs`). O inventário do bloco 11 não encontrou implementação REST/serviços do backend Seek, portanto não há comportamento backend Seek a testar nesta etapa.

**Trecho:** lista de arquivos inclui `feed-visibility`, `feed-post-counts`, `feed-global-listing`, `feed-hashtag-policy`; o diretório backend `modules/seek` não contém fonte executável.

### 14-007 — Não há script de lint declarado nos manifests examinados

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** scripts raiz, backend, frontend, scripts e database foram listados nos blocos 02/11 e nesta etapa. Há `typecheck`, `build`, `test` e `check` de migrations, mas não foi encontrado script `lint`/`format:check` nesses manifests.

**Trecho:** `package.json` raiz declara `test`, `build`, `typecheck:libs` e `typecheck`; `Aplicativo/front/package.json` declara `build`, `serve`, `typecheck` e E2E.

**Impacto:** isso não prova baixa qualidade de formatação; apenas que o fluxo automatizado de lint/format não está exposto nesses comandos.

### 14-008 — Typecheck, build, migrations e testes não foram executados nesta auditoria

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta antes de qualquer gate de validação

**Evidência:** o prompt aplicável restringe este trabalho a auditoria estática e proíbe testes, builds, codegen, migrations e processos. Os comandos encontrados são evidência de disponibilidade, não de resultado atual. Nenhuma afirmação de “passou” é feita neste bloco.

**Trecho:** execução omitida por restrição expressa de escopo; comandos identificados nos manifests: `pnpm test`, `pnpm typecheck`, `pnpm build`, `drizzle-kit check` e `test:baselines`.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 4 |
| PARCIAL | 3 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** síntese, riscos prioritários e plano de ação por etapas com gates de revisão.
