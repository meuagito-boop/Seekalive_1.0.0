# 01 — Repositório, plataforma e configuração

## Método e limites

Inspeção estática de manifests, lockfile, configuração de execução e nomes de variáveis. O servidor de desenvolvimento existente foi consultado apenas com `HEAD`; nenhum processo foi iniciado ou reiniciado. Segredos foram tratados como nomes de variáveis somente.

## Achados

### 01-001 — A árvore separa aplicações, infraestrutura e contratos, mas isso não prova coesão de cada domínio

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `find . -maxdepth 2 -type d` executado em `Seekalive/Projeto` listou, entre outros, `Aplicativo/back`, `Aplicativo/front`, `infra/database`, `infra/cache`, `infra/queues`, `infra/storage`, `infra/deployment`, `shared/api-spec`, `shared/contracts`, `docs`, `auditoria`, `tests` e `scripts`. `pnpm-workspace.yaml:37–42` declara os grupos `Aplicativo/*`, `shared/*`, `infra/*`, `artifacts/*` e `scripts`.

**Leitura técnica:** A separação física de alto nível existe. Ela não confirma, por si só, que arquivos, dependências e regras estejam coesos dentro de cada domínio. Essa conclusão depende dos blocos de código e dependências seguintes; não se deve tratar a árvore como prova de arquitetura correta.

### 01-002 — A versão de Node declarada pelo repositório conflita com o runtime declarado no Replit

**Veredito:** CONTRADITO  
**Prioridade:** Alta

**Evidência:** `Seekalive/Projeto/package.json:5–8` declara `pnpm@10.26.1` e Node `>=22.18.0`. `.replit:1` declara `modules = ["nodejs-20"]`. O runtime observado somente por `node --version` foi `v22.23.4`; `pnpm --version` retornou `10.26.1`.

```text
package.json: "node": ">=22.18.0"
.replit: modules = ["nodejs-20"]
runtime observado: v22.23.4
```

**Risco:** O ambiente atualmente observado satisfaz o requisito do pacote, mas a configuração registrada do Replit aponta para Node 20. Uma reconstrução/instalação limpa pode selecionar runtime incompatível ou diferir do runtime atual. Nenhuma reconstrução foi executada para testar esse cenário.

### 01-003 — As versões principais observadas no lockfile estão alinhadas em Zod 4, Orval 8 e Drizzle ORM 0.45

**Veredito:** CONFIRMADO, limitado às entradas observadas  
**Prioridade:** Média

**Evidência:** `pnpm-lock.yaml` contém entradas resolvidas `argon2@0.45.1` (linha 1888), `drizzle-kit@0.31.10` (2041), `drizzle-orm@0.45.2` (2045), `express@5.3.0` (2223), `orval@8.44.0` (2547), `pino@9.14.0` (2646) e `zod@4.6.7` (3098). `Aplicativo/back/package.json:15–24` declara Express, Drizzle, Zod e demais dependências da API; `shared/api-spec/package.json:6–10` declara Orval `^8.44.0`; `pnpm-workspace.yaml:56–68` concentra Drizzle ORM e Zod no catálogo.

**Limite da conclusão:** A auditoria ainda não concluiu a busca de todas as versões transitivas de Zod nem verificou compatibilidade comportamental entre Orval, `drizzle-zod` e os schemas. Não se afirma ainda ausência total de versões duplicadas ou de conflitos.

### 01-004 — O script pós-merge instala dependências e verifica o pacote de banco; não foi executado

**Veredito:** CONFIRMADO  
**Prioridade:** Baixa

**Evidência:** `Seekalive/Projeto/scripts/post-merge.sh:8–9`:

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run check
```

**Risco/limite:** O script não executado não comprova que instalação, migrations ou checagem passem no ambiente atual. A auditoria foi instruída a não executar esse fluxo.

### 01-005 — Há proteção explícita contra `push` fora de um schema de teste isolado, mas ela depende de usar o wrapper

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `Seekalive/Projeto/infra/database/scripts/push-isolated.mjs:3–12` exige `NODE_ENV=test`, `SEEKALIVE_DB_SCHEMA` no formato `seekalive_test_<32 hex>` e `SEEKALIVE_DB_MIGRATION_TARGET=replit`; caso contrário, encerra com erro. `infra/database/package.json:26` aponta o script `push` para esse wrapper. `infra/database/drizzle.push.config.ts:6–19` define a configuração de `drizzle-kit push` e escolhe URL por `resolveDatabaseConnectionUrl`.

**Risco/limite:** A barreira está no script de pacote; a inspeção estática não prova que operadores ou automações não chamem diretamente `drizzle-kit push --config ./drizzle.push.config.ts`. Nenhum `push` foi executado.

### 01-006 — O alvo do banco de runtime pode cair em Replit por padrão; migrações exigem alvo explícito

**Veredito:** CONFIRMADO  
**Prioridade:** Média

**Evidência:** `Seekalive/Projeto/infra/database/src/connection.ts:24–35` escolhe `SEEKALIVE_DATABASE_TARGET` para runtime e `SEEKALIVE_DB_MIGRATION_TARGET` para migrations; quando runtime não define alvo, `connection.ts:28–32` fornece `"replit"` como padrão. O URL é selecionado entre `DATABASE_URL` e `SEEKALIVE_EXTERNAL_DATABASE_URL`, sem imprimir ou acessar o valor nesta auditoria. Migrações não têm default (`connection.ts:10–16`).

**Leitura técnica:** O caminho externo está preparado por variável de seleção, mas a conexão externa não foi validada nem usada. Isso não é evidência de que haja banco externo ou configuração de produção.

### 01-007 — O tipo de implantação e os valores efetivos de configuração não puderam ser confirmados

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Média

**Evidência:** `.replit:1–10` declara módulo Node, canal Nix e portas locais/externas; não contém bloco de implantação. O inventário de nomes encontrou variáveis de runtime, teste e Vite, incluindo `DATABASE_URL`, `SEEKALIVE_DATABASE_TARGET`, `SEEKALIVE_DB_MIGRATION_TARGET`, `SESSION_SECRET`, `RESEND_API_KEY`, `RESEND_ENABLED` e `RESEND_FROM_EMAIL`. Os valores não foram lidos. `Seekalive/Projeto/Aplicativo/back/package.json:6–10` define `dev`, `build`, `start` e `typecheck`; não define um script de deploy.

**Razão:** O prompt proíbe leitura de segredos e acesso à produção. A configuração visível não basta para determinar o ambiente de publicação, serviços gerenciados, domínios ou valores efetivamente ativos.

### 01-008 — O processo de execução local responde ao endpoint de prontidão, mas esse HEAD não valida as dependências funcionais

**Veredito:** PARCIAL  
**Prioridade:** Baixa

**Evidência:** Requisição permitida `HEAD https://$REPLIT_DEV_DOMAIN/api/readyz` retornou `HTTP/2 200`, `content-type: application/json`, `x-powered-by: Express` e `x-request-id`. O cabeçalho não contém `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` ou `X-Content-Type-Options`.

**Limite da conclusão:** Isso comprova apenas a resposta do endpoint de desenvolvimento naquele instante. Não comprova autenticação, banco, storage, integrações, funcionamento de fluxos nem o estado de produção. Os cabeçalhos observados serão tratados no bloco HTTP/segurança; não se extrapola para produção.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 3 |
| CONTRADITO | 1 |
| NÃO VERIFICADO | 1 |

**Pendências para a síntese:** confirmar todo o grafo de versões Zod/Orval; comparar workflows e variáveis documentadas com código; inspecionar os módulos restantes e a configuração do servidor.
