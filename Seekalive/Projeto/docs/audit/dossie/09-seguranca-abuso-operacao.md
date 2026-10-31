# 09 — Segurança transversal, abuso e operação

## Escopo

Revisão estática de IP e proxy usados em rate limits, limites por rota, parsing de requisição, logs, erros e health checks. Não foi executado scan, teste de ataque, teste de carga ou acesso a configurações de produção.

## Achados

### 09-001 — IP não é a identidade durável de sessão; o código o usa no rate limit

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `security/rateLimit.ts:13–16` constrói a chave por nome do limite e IP. A busca de referências no backend encontrou `getTrustedClientIp` usado pelo rate limiter; `requireTrustedClientIp` existe, mas não tem chamada nos módulos da API. O catálogo de Auth descrito no bloco 05 não contém IP de sessão/dispositivo.

**Trecho:** `const key = \`${name}:${getTrustedClientIp(request) ?? request.ip ?? "unknown"}\`;`. A busca `rg -n 'requireTrustedClientIp|getTrustedClientIp|CLIENT_IP_UNAVAILABLE|TRUSTED_CLIENT_IP_HEADER' Aplicativo/back/src Aplicativo/front/vite.config.ts` encontrou `getTrustedClientIp` no rate limiter e nenhuma chamada a `requireTrustedClientIp`.

**Conclusão:** no código examinado, o IP participa do controle de frequência, não do reconhecimento durável da instalação.

### 09-002 — A extração de `X-Forwarded-For` escolhe o endereço válido mais à direita

**Veredito:** PARCIAL  
**Prioridade:** Alta

**Evidência:** `front/src/server/forwarded-client-ip.ts:6–11` percorre a lista separada por vírgulas de trás para frente. `front/vite.config.ts:71–80` remove os cabeçalhos encaminhados recebidos e cria `x-seekalive-client-ip` com esse resultado. O backend só aceita o cabeçalho customizado se o socket for loopback (`back/src/security/trustedClientIp.ts:16–23`).

**Trecho:** `for (let index = values.length - 1; index >= 0; index -= 1) { ... if (candidate && isIP(candidate)) return candidate; }`.

**Impacto:** numa cadeia de proxies com mais de um endereço, o código escolhe o último endereço válido, que pode ser o proxy mais próximo, não o endereço original. Não foi verificado qual formato a borda do ambiente de desenvolvimento entrega; portanto, a chave de IP efetiva não está comprovada para todos os acessos.

### 09-003 — Rate limit é local ao processo, não compartilhado entre instâncias

**Veredito:** PARCIAL  
**Prioridade:** Alta antes de escalar horizontalmente

**Evidência:** `security/rateLimit.ts:5–6` armazena buckets em `Map` na memória do processo. Não há store compartilhado nesse componente. Reinício do processo zera contadores; duas réplicas podem manter limites independentes.

**Trecho:** `const rateLimitBuckets = new Map<string, RateLimitBucket>();`.

**Limite:** para a instância de desenvolvimento atual, o código funciona como limitador local; o comportamento multi-instância não foi testado.

### 09-004 — Há limites por rota e resposta `429` com `Retry-After`

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `security/rateLimit.ts:8–33` usa janelas fixas, responde `429` e inclui `Retry-After`. Rotas definem limites, por exemplo login 10/15 min (`auth/presentation/loginRoutes.ts:26`) e upload 20/min, leitura de mídia 120/min e exclusão 30/min (`media/presentation/mediaRoutes.ts:86–89,152–155,222–225`).

**Trecho:** `bucket.resetAt = now + windowMs`; quando excede, `response.setHeader("Retry-After", ...)` e `sendApiError(response, 429, "RATE_LIMITED", ...)`.

**Limite:** as chaves são por rota e IP, não por conta autenticada; usuários atrás de um IP compartilhado podem dividir bucket e um mesmo usuário pode usar IPs diferentes. O upload permite até 100 MiB por arquivo, então o teto teórico por IP é elevado; não foi executado teste de carga.

### 09-005 — O mapa de buckets não tem teto estrito de entradas ativas

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `rateLimit.ts:23–27` só tenta remover entradas expiradas quando o tamanho passa de 10.000; se muitas chaves diferentes continuarem ativas, a limpeza não limita o número total de buckets.

**Trecho:** `if (rateLimitBuckets.size > 10_000) { ... if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey); }`.

**Impacto:** tráfego distribuído com muitos endereços distintos pode aumentar a memória usada no processo até os buckets expirarem; a quantidade máxima não é limitada por uma política explícita.

### 09-006 — O corpo é parseado antes dos rate limits das rotas

**Veredito:** PARCIAL  
**Prioridade:** Média

**Evidência:** `app.ts:41–50` instala os parsers JSON/urlencoded antes de montar `/api`; os rate limits são middlewares internos das rotas (por exemplo, `loginRoutes.ts:26`). O JSON comum é limitado a 32 KiB e escrita de artigo a 256 KiB (`app.ts:41–46`).

**Trecho:** `app.use((request, response, next) => { ... parser(request, response, next); });` aparece antes de `app.use("/api", router)`.

**Impacto:** limite por rota não impede o custo de receber e parsear o corpo permitido antes de rejeitar a chamada. O tamanho é limitado, mas esse ordenamento reduz a eficácia do rate limit como proteção de recursos.

### 09-007 — Logs HTTP usam ID de requisição e omitem query string/cabeçalhos

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `app.ts:14–38` gera UUID de requisição, remove a query string do serializer e devolve `X-Request-Id`. `common/logger.ts:5–18` redige autorização, cookies e `set-cookie`. O serializer HTTP inclui método, URL sem query e status, sem corpo/cabeçalhos (`app.ts:18–30`).

**Trecho:** serializer retorna apenas `{ id, method, url: req.url?.split("?")[0] }`; redaction inclui `"req.headers.authorization"` e `"req.headers.cookie"`.

### 09-008 — Respostas de erro são genéricas e o readiness verifica o banco

**Veredito:** CONFIRMADO  
**Prioridade:** Informativa

**Evidência:** `app.ts:56–79` converte erros desconhecidos em 500 genérico e registra somente nome/código. `common/apiErrors.ts:14–22` devolve código numérico, chave e `requestId`. `health/presentation/readinessRoutes.ts:6–12` retorna 503 genérico quando a verificação falha; `health/infrastructure/databaseReadiness.ts:3–6` executa `SELECT 1` com timeout de 1.500 ms.

**Trecho:** em falha do readiness, `response.status(503).json({ status: "not_ready" })`; a consulta de banco usa `{ text: "SELECT 1", query_timeout: 1_500 }`.

### 09-009 — Cabeçalhos de proteção não estão aplicados globalmente

**Veredito:** CONFIRMADO  
**Prioridade:** Alta antes da publicação

**Evidência:** `app.ts:10–50` não instala middleware global de cabeçalhos de segurança. A verificação `HEAD /api/readyz` no servidor de desenvolvimento e o preflight estão detalhados no bloco 02; a resposta observada tinha `x-powered-by` e não apresentou CSP, HSTS, frame, referrer ou permissions policy. A rota de mídia define `nosniff` apenas no arquivo (`mediaRoutes.ts:203–208`).

**Trecho:** após `app.set("trust proxy", false)`, `app.ts` instala `pinoHttp`, parsers e router sem middleware global de cabeçalhos de segurança.

### 09-010 — A identidade de IP e os controles de borda fora do ambiente atual permanecem desconhecidos

**Veredito:** NÃO VERIFICADO  
**Prioridade:** Alta antes de qualquer publicação

**Evidência:** nenhuma requisição de produção, configuração de ingress publicada, lista confiável de proxies, teste com múltiplos saltos ou scanner ativo foi consultado. O `trust proxy=false` e a configuração Vite observados são do código local de desenvolvimento, não evidência de comportamento da infraestrutura futura.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 5 |
| PARCIAL | 4 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |

**Próximo bloco:** integração do frontend com a API e fronteiras entre dados demonstrativos e dados reais.
