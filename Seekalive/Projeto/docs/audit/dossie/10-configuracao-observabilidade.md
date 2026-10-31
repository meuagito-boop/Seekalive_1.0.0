# 10 — Configuração, observabilidade e operação

## Escopo e método

Inventário estático das variáveis de ambiente pelo nome, validação de configuração, ciclo de vida do processo, logs e readiness. Nenhum valor de ambiente, segredo, log de execução ou configuração de produção foi lido. Não foram iniciados, reiniciados ou interrompidos processos.

## Achados

### 10-001 — A porta é obrigatória, mas a validação não verifica todo o intervalo de portas

**Afirmação da doc:** N/A — verificação de configuração de inicialização.  
**Veredito:** PARCIAL  
**Risco:** Baixo no desenvolvimento — valor fora do intervalo suportado pode falhar somente ao abrir o servidor.

**Evidência:** `Aplicativo/back/src/index.ts:6–18` exige `PORT`, converte para número e rejeita `NaN`/valores não positivos; não valida inteiro nem limite superior antes de `app.listen`.

**Trecho:** `if (Number.isNaN(port) || port <= 0) throw new Error(...)`.

### 10-002 — Segredo e duração de sessão têm validação fail-fast

**Afirmação da doc:** N/A — avaliação de configuração sensível.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — configuração ausente ou fraca interrompe o carregamento do módulo em vez de reduzir silenciosamente a segurança.

**Evidência:** `security/sessionConfig.ts:6–16` exige `SESSION_SECRET` com ao menos 32 bytes e limita `SESSION_TTL_SECONDS` a inteiro entre 60 segundos e 30 dias; o padrão configurado é sete dias.

**Trecho:** configuração inválida lança erro durante a inicialização do módulo.

### 10-003 — Variáveis de ambiente não passam por um validador central único

**Afirmação da doc:** N/A — inventário de configuração distribuída.  
**Veredito:** PARCIAL  
**Risco:** Médio — defaults e verificações podem variar por consumidor; a lista abaixo é o que o código pesquisado referencia, não um contrato de implantação completo.

**Evidência:** inventário estático com `rg -o --hidden --no-filename 'process\\.env\\....|import\\.meta\\.env\\....'` em fontes e ferramentas, sem valores: `APP_ORIGIN`, `AUDIT_SCOPE`, `BASE_PATH`, `DATABASE_URL`, `LOG_LEVEL`, `NODE_ENV`, `PORT`, `REPL_ID`, `REPLIT_DEPLOYMENT`, `REPLIT_DEV_DOMAIN`, `RESEND_API_KEY`, `RESEND_ENABLED`, `RESEND_FROM_EMAIL`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS`, `SEEKALIVE_CHROMIUM_EXECUTABLE_PATH`, `SEEKALIVE_DATABASE_TARGET`, `SEEKALIVE_DB_MIGRATION_TARGET`, `SEEKALIVE_DB_MIGRATION_TRACK`, `SEEKALIVE_DB_SCHEMA`, `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_WEB_URL`, `SESSION_SECRET`, `SESSION_TTL_SECONDS`, `import.meta.env.BASE_URL` e `import.meta.env.DEV`. `connection.ts:26–34` também lê os nomes `SEEKALIVE_EXTERNAL_DATABASE_URL` e `DATABASE_URL` do objeto de ambiente recebido.

**Defaults e validações identificados no código:**

| Variáveis | Comportamento estático constatado |
|---|---|
| `PORT` | obrigatória; conversão numérica e validação de valor positivo. Inteiro e teto de porta não são verificados antes de `listen` (`back/src/index.ts:6–18`). |
| `SESSION_SECRET`, `SESSION_TTL_SECONDS` | segredo mínimo de 32 bytes; TTL padrão de sete dias, inteiro entre 60 segundos e 30 dias (`security/sessionConfig.ts:6–16`). |
| `LOG_LEVEL` | padrão `info`; não foi localizada validação de allowlist (`common/logger.ts:5–19`). |
| `NODE_ENV` | condiciona logs, envio de e-mail e armazenamento local de mídia; o comportamento depende de comparações locais, sem parser central (`emailDelivery.ts:24,36–38`; `localMediaFileStore.ts:61`). |
| `RESEND_API_KEY`, `RESEND_ENABLED`, `RESEND_FROM_EMAIL` | chave opcional, envio habilitado somente quando a flag é exatamente `true`, remetente pode usar fallback no código (`emailDelivery.ts:36–40`). Valores efetivos não foram consultados. |
| `DATABASE_URL`, `SEEKALIVE_EXTERNAL_DATABASE_URL`, `SEEKALIVE_DATABASE_TARGET`, `SEEKALIVE_DB_MIGRATION_TARGET` | resolver seleciona o alvo de runtime e migração; runtime pode assumir alvo Replit, enquanto migração exige escolha explícita (`infra/database/src/connection.ts:10–35`). URLs não foram lidas. |
| `SEEKALIVE_DB_SCHEMA`, `SEEKALIVE_EXPECTED_DATABASE`, `SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS`, `REPLIT_DEPLOYMENT` | guardas de schema isolado e testes, não configuração de tráfego da aplicação (`infra/database/schema/config.ts:3–10`; scripts do banco). |
| `BASE_PATH`, `REPL_ID`, `REPLIT_DEV_DOMAIN`, `SEEKALIVE_WEB_URL`, `SEEKALIVE_CHROMIUM_EXECUTABLE_PATH`, `APP_ORIGIN`, `AUDIT_SCOPE`, `SEEKALIVE_DB_MIGRATION_TRACK` | referências de build, testes, auditoria ou ferramenta; não são segredos de autenticação. Defaults/validações variam por consumidor e não foram todos rastreados até o último uso. |

**Comando:** inventário estático por `rg` no repositório, filtrando código e configurações de execução; usos de ambiente também passam por `infra/database/src/connection.ts`, que recebe `process.env` como objeto. Nenhum valor de variável foi lido.

**Limite:** a busca é estática e não consultou o ambiente nem prova que todos os scripts ou pacotes foram incluídos.

### 10-004 — Logs HTTP carregam ID de requisição e redigem cabeçalhos de autenticação

**Afirmação da doc:** Logs não devem registrar cookies nem query strings sensíveis.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — revisão estática; nenhum conteúdo de log foi acessado.

**Evidência:** `back/src/app.ts:14–38` gera UUID, registra método/URL sem query/status e envia `X-Request-Id`. `common/logger.ts:5–19` redige Authorization, Cookie e Set-Cookie.

**Trecho:** serializer reduz a URL a `req.url?.split("?")[0]`; a lista de redaction inclui `req.headers.cookie`.

### 10-005 — Readiness verifica apenas conectividade com PostgreSQL

**Afirmação da doc:** O endpoint de readiness é uma indicação de disponibilidade da aplicação.  
**Veredito:** PARCIAL  
**Risco:** Médio — pode responder `ready` mesmo se worker ou serviços não essenciais estiverem indisponíveis.

**Evidência:** `health/presentation/readinessRoutes.ts:6–12` executa callback do banco e retorna `ready`/503. `health/infrastructure/databaseReadiness.ts:3–6` executa `SELECT 1` com timeout de 1.500 ms. Não foram encontrados checks de Resend, worker de exclusão ou dependências de outros domínios nessa resposta.

**Trecho:** readiness faz `await checkDatabase()`; a consulta é somente `SELECT 1`.

### 10-006 — Shutdown tenta encerrar worker, servidor e pool com limite de dez segundos

**Afirmação da doc:** N/A — inspeção do ciclo de vida do processo.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — nenhum sinal foi enviado durante a auditoria.

**Evidência:** `back/src/index.ts:58–108` registra `SIGTERM`/`SIGINT`, interrompe o worker de exclusão, fecha servidor e pool e define timer de encerramento forçado de dez segundos. `:25–36` marca erro de listen como falha de processo.

**Trecho:** `process.once("SIGTERM", ...)`, `process.once("SIGINT", ...)` e `setTimeout(..., 10_000)`.

### 10-007 — Falha de inicialização do worker de exclusão é registrada, mas não bloqueia readiness

**Afirmação da doc:** N/A — consequência da composição atual do worker.  
**Veredito:** PARCIAL  
**Risco:** Médio — processo HTTP pode continuar disponível enquanto a exclusão agendada não é processada.

**Evidência:** `back/src/index.ts:41–55` inicia o worker após `listening`; a rejeição é apenas registrada. O readiness do achado 10-005 verifica somente o banco.

**Trecho:** `.catch(...)` registra `Account deletion worker failed to start`; não altera estado de readiness ou `process.exitCode`.

### 10-008 — Não há evidência de métricas ou alertas operacionais no servidor

**Afirmação da doc:** N/A — inventário de observabilidade no código.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Médio — a auditoria não verificou plataforma externa de métricas/alertas.

**Evidência:** a busca `rg -n 'metrics|prometheus|opentelemetry|alert' Aplicativo/back/src --glob '*.ts'` não apresentou implementação de métricas/exporter no backend. Não foram consultados recursos de observabilidade externos nem logs de execução.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 4 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |
