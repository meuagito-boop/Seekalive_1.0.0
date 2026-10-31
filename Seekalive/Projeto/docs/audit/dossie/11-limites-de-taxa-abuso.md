# 11 — Limites de taxa e abuso

## Escopo e método

Inventário estático dos limitadores Express, chaves, janelas, rotas sem limitador local identificado e ordem do parser. Não foram executados testes de carga, chamadas automatizadas ou alteração de configuração.

## Achados

### 11-001 — O código define 55 usos de limitador por endpoint

**Afirmação da doc:** N/A — inventário dos limites aplicados no código atual.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — a presença de um limite não comprova que os valores sejam adequados sob carga.

**Evidência:** `rg -n 'createAuthRateLimit\\(' Aplicativo/back/src/modules --glob '*.ts'` retorna 55 chamadas. A tabela abaixo consolida todas as chamadas encontradas; a janela é fixa e expressa em chamadas por período.

| Domínio | Limites encontrados |
|---|---|
| Auth | `register` 5/15 min; `login` 10/15 min; `verify-resend` 3/15 min; `verify-confirm` 10/15 min; `device-login-confirm` 10/15 min; `device-login-resend` 5/15 min; `password-reset-request` 5/15 min; `password-reset-confirm` 10/15 min; `password-update` 5/15 min; `password-update-confirm` 10/15 min; `account-email-change-request` 5/15 min; `account-email-change-new-confirm` 10/15 min; `account-password-change-request` 5/15 min; `account-password-change-confirm` 10/15 min; `account-deletion-code` 5/15 min; `account-deletion-confirm` 10/15 min; `account-restoration-code` 5/15 min; `account-restoration-confirm` 10/15 min; `sessions-list` 60/15 min; `sessions-revoke-others` 10/15 min; `session-revoke` 20/15 min; `devices-list` 60/15 min; `devices-revoke-others` 10/15 min; `device-revoke` 20/15 min. |
| Profiles | `account-availability` 30/min; `account-profile-update` 30/15 min; `business-profile-review-create`, `business-profile-review-delete`, `business-profile-review-reply` 30/min cada. |
| Social | `social-account-search` 60/min; `social-follow` 60/min; `social-block` 30/min. |
| Feed | `feed-article-create` 10/min; `feed-article-read` 120/min; `feed-comment-create` 10/min; `feed-comment-delete` 30/min; `feed-comment-like` e `feed-comment-unlike` 90/min; `feed-comments-read` 120/min; `feed-global-list` 120/min; `feed-post-bookmark` e `feed-post-unbookmark` 60/min; `feed-post-create` 20/min; `feed-post-delete` 30/min; `feed-post-like` e `feed-post-unlike` 90/min; `feed-post-read` 120/min; `feed-post-reference-read` 120/min; `feed-post-repost` e `feed-post-unrepost` 30/min; `feed-profile-content` 120/min. |
| Media | `social-media-upload` 20/min; `social-media-read` 120/min; `social-media-delete` 30/min. |

### 11-002 — Os buckets são por IP e processo, não por identidade da conta

**Afirmação da doc:** O endereço IP é usado somente como sinal de rate limit, não como identidade permanente da instalação.  
**Veredito:** CONFIRMADO  
**Risco:** Médio — IP compartilhado pode causar bloqueios colaterais; múltiplos IPs podem multiplicar a cota efetiva.

**Evidência:** `security/rateLimit.ts:5–16` mantém um `Map` no processo e monta chave `${name}:${getTrustedClientIp(request) ?? request.ip ?? "unknown"}`. Não existe chave da conta autenticada nesse código.

**Trecho:** `const rateLimitBuckets = new Map<string, RateLimitBucket>();`.

### 11-003 — A instância não compartilha os limites com outros processos e a limpeza não impõe teto estrito

**Afirmação da doc:** N/A — escalabilidade e retenção de bucket.  
**Veredito:** PARCIAL  
**Risco:** Alto antes de escalar horizontalmente; Médio para crescimento de memória em distribuição ampla de IPs.

**Evidência:** `rateLimit.ts:23–27` remove buckets expirados somente após o mapa exceder 10.000 entradas; não limita entradas ainda ativas. Um reinício zera o estado, e réplicas mantêm mapas distintos.

**Trecho:** a limpeza condiciona-se a `rateLimitBuckets.size > 10_000` e remove apenas `value.resetAt <= now`.

### 11-004 — Quinze arquivos de rotas não têm `createAuthRateLimit` local

**Afirmação da doc:** N/A — identificação de rotas sem middleware local de rate limit.  
**Veredito:** PARCIAL  
**Risco:** Alto para endpoints de escrita/autenticação se não houver proteção equivalente herdada; alguns arquivos são liveness/readiness e não precisam da mesma política.

**Evidência:** o comando `for f in $(rg -l 'router\\.(get|post|put|patch|delete)\\(' Aplicativo/back/src/modules --glob '*.ts' | sort); do rg -q 'createAuthRateLimit\\(' "$f" || echo "$f"; done` retornou:

`auth/presentation/csrfRoutes.ts`; `health/presentation/livenessRoutes.ts`; `health/presentation/readinessRoutes.ts`; `onboarding/presentation/routes.ts`; `profiles/presentation/privacyRoutes.ts`; `profiles/presentation/publicProfileRoutes.ts`; `social/presentation/acceptFollowRequestRoutes.ts`; `social/presentation/blockListRoutes.ts`; `social/presentation/circleRoutes.ts`; `social/presentation/declineFollowRequestRoutes.ts`; `social/presentation/followerListRoutes.ts`; `social/presentation/followingListRoutes.ts`; `social/presentation/followRequestListRoutes.ts`; `social/presentation/unblockAccountRoutes.ts`; `social/presentation/unfollowAccountRoutes.ts`.

**Limite:** a verificação é por arquivo, não prova ausência de um limitador aplicado em router pai. O inventário de composição e middleware do bloco 02 não encontrou rate limiter global.

### 11-005 — A seleção de IP em cadeia de proxies pode escolher o salto incorreto

**Afirmação da doc:** N/A — avaliação da origem do IP usado no bucket.  
**Veredito:** PARCIAL  
**Risco:** Alto em ambiente com cadeia de proxies — buckets podem ser compartilhados pelo IP do proxy ou contornados conforme a topologia.

**Evidência:** `front/src/server/forwarded-client-ip.ts:6–11` percorre `X-Forwarded-For` da direita para a esquerda. `front/vite.config.ts:71–80` remove os headers encaminhados e define o header interno. `back/src/security/trustedClientIp.ts:16–23` só aceita esse header em socket loopback. A topologia futura não foi consultada.

**Trecho:** percorre a lista do último índice para o primeiro e retorna o primeiro IP válido.

### 11-006 — Parser de corpo roda antes dos limitadores das rotas

**Afirmação da doc:** N/A — análise da ordem de custo por requisição.  
**Veredito:** PARCIAL  
**Risco:** Médio — chamadas excedentes ainda podem consumir o custo de parsing do corpo permitido.

**Evidência:** `back/src/app.ts:41–50` aplica parser JSON (32 KiB padrão; 256 KiB para artigo) e urlencoded antes de montar `/api`. O rate limit de login, por exemplo, é aplicado internamente em `loginRoutes.ts:26`.

**Trecho:** `app.use("/api", router)` aparece após o middleware de parsing.

### 11-007 — O limitador retorna 429 e `Retry-After`, mas a janela é fixa

**Afirmação da doc:** N/A — comportamento de resposta.  
**Veredito:** CONFIRMADO  
**Risco:** Informativo — rajadas podem ocorrer na fronteira entre janelas; não há algoritmo deslizante/token bucket.

**Evidência:** `security/rateLimit.ts:13–34` incrementa contador e compara com limite; quando excede, retorna `429` e `Retry-After` calculado até o reset.

**Trecho:** `bucket.resetAt = now + windowMs`; excedido o limite, `sendApiError(response, 429, "RATE_LIMITED", ...)`.

### 11-008 — Adequação dos limites sob carga e em rede real não foi medida

**Afirmação da doc:** N/A — limite de validação de segurança somente leitura.  
**Veredito:** NÃO VERIFICADO  
**Risco:** Alto antes de qualquer lançamento público.

**Evidência:** nenhum teste de carga, burst, múltiplas instâncias, IP compartilhado, proxy de múltiplos saltos ou bloqueio de conta foi executado. O ambiente de produção não foi acessado.

## Contagem deste bloco

| Veredito | Quantidade |
|---|---:|
| CONFIRMADO | 3 |
| PARCIAL | 4 |
| CONTRADITO | 0 |
| NÃO VERIFICADO | 1 |
