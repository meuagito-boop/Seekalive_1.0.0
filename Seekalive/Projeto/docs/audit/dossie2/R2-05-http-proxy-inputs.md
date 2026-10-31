# R2-05 — HTTP, proxy, IP de rate limit e entrada externa

**Status:** leitura estática concluída; matriz sintética das funções de IP executada sem rede, servidor HTTP ou banco. Nenhuma alteração no comportamento do aplicativo.

## Fronteira HTTP e proxy

| Ponto | Evidência e resultado |
|---|---|
| Express `trust proxy` | Desativado (`Aplicativo/back/src/app.ts:12`). `request.ip` não aceita automaticamente `X-Forwarded-For`; o servidor confia no peer TCP direto. |
| IP reconhecido como cliente | `getTrustedClientIp` só aceita `x-seekalive-client-ip` quando o peer direto é loopback e o valor é um IP válido (`security/trustedClientIp.ts:7-23`). Header apresentado por peer externo é ignorado. |
| Proxy de desenvolvimento | O proxy `/api` do Vite remove `x-forwarded-for` e qualquer header `x-seekalive-client-ip` recebido; depois acrescenta o header interno a partir do valor calculado (`front/vite.config.ts:67-81`). A API alvo é loopback. |
| Cálculo do header interno | `extractForwardedClientIp` percorre a cadeia de `X-Forwarded-For` da direita para a esquerda e seleciona o primeiro IP válido (`front/src/server/forwarded-client-ip.ts:3-13`). Não há lista/cadastro de proxies confiáveis nem limite de saltos nessa função. |
| Rate limit | A chave usa IP interno validado ou, na ausência dele, `request.ip` (`back/src/security/rateLimit.ts:13-16`). Se o proxy de desenvolvimento não fornecer o header interno, todos os clientes que chegam pelo mesmo peer podem cair no mesmo bucket. A limitação em memória por processo já consta em R2-03-001; aqui registra-se apenas o efeito de topologia. |
| Produção | O proxy examinado está na configuração `server` do Vite, isto é, no fluxo de servidor de desenvolvimento. A configuração `preview` só define porta/host e não cria o encaminhamento `/api` (`vite.config.ts:62-104`). Não há nesta etapa evidência de proxy/reverse proxy de produção; nenhum comportamento de produção foi inferido ou testado. |
| Same-origin/CORS | Clientes web usam caminhos relativos `/api`. O aplicativo não registra middleware CORS. O desenvolvimento funciona pelo proxy do Vite; uma futura hospedagem precisa encaminhar `/api` na mesma origem ou definir explicitamente a política entre origens. |
| CSRF e cabeçalhos encaminhados | A API compara `Origin` com protocolo/host derivados de `X-Forwarded-Proto` e `X-Forwarded-Host` quando presentes (`security/csrf.ts:23-32`), embora Express mantenha `trust proxy=false`. O Vite de desenvolvimento sobrescreve os encaminhados a partir de `Origin`/`Host` (`vite.config.ts:82-91`). A fronteira equivalente na hospedagem futura ainda não está especificada. O token HMAC de CSRF continua obrigatório para mutações. |

### Resultado da matriz sintética de IP

Foi executado `node docs/audit/dossie2/experimentos/trusted-ip-matrix.mjs`, que transpila em memória as funções TypeScript existentes e as exercita com objetos de requisição/endereço sintéticos. Não fez chamada HTTP ou acesso a dados.

**22/22 casos sintéticos passaram:** os nove casos de função isolada e mais treze composições API/proxy:

1. Header interno válido vindo de peer loopback é aceito.
2. Apenas `X-Forwarded-For` chegando diretamente ao resolvedor da API é ignorado.
3. Peer não-loopback não pode escolher o IP por `x-seekalive-client-ip`.
4. Header interno inválido é rejeitado.
5. Ausência do header interno retorna `null`.
6. Endereço encaminhado único é aceito pela função Vite.
7. Em cadeia de endereços, a função atual seleciona o **último** IP válido.
8. Valores inválidos são ignorados.
9. Header ausente retorna `null`.

| Peer TCP da API | Header interno | `X-Forwarded-For` | Bucket esperado/observado |
|---|---|---|---|
| Loopback | Ausente | 1 salto | `127.0.0.1`; XFF direto é ignorado |
| Loopback | Ausente | 2 saltos | `127.0.0.1`; XFF direto é ignorado |
| Loopback | Ausente | 3 saltos | `127.0.0.1`; XFF direto é ignorado |
| Loopback | `203.0.113.77` | 1 salto | `203.0.113.77` |
| Loopback | `203.0.113.77` | 2 saltos | `203.0.113.77` |
| Loopback | `203.0.113.77` | 3 saltos | `203.0.113.77` |
| Externo `192.0.2.20` | Forjado `203.0.113.77` | 1 salto | `192.0.2.20`; header interno externo é ignorado |
| Externo `192.0.2.20` | Forjado `203.0.113.77` | 2 saltos | `192.0.2.20`; header interno externo é ignorado |
| Externo `192.0.2.20` | Forjado `203.0.113.77` | 3 saltos | `192.0.2.20`; header interno externo é ignorado |
| Loopback após proxy Vite | O Vite calcula pelo XFF | 1 salto | `203.0.113.42` |
| Loopback após proxy Vite | O Vite calcula pelo XFF | 2 saltos | `198.51.100.24` (salto mais próximo) |
| Loopback após proxy Vite | O Vite calcula pelo XFF | 3 saltos | `192.0.2.10` (salto mais próximo) |
| Loopback após proxy Vite | XFF forjado de um endereço, se chegar intacto | 1 salto | O endereço forjado `198.51.100.99` é aceito como candidato |

No caso de XFF forjado, o script comprova o que ocorre **se** esse header chegar intacto ao Vite. Não prova que a borda real o aceite: o ambiente/proxy de hospedagem não foi exercitado.

O teste prova as funções com entradas sintéticas; **não** prova quais cabeçalhos o edge/proxy do ambiente real envia, nem a cadeia de proxies usada na implantação.

## Limites de corpo, erros e observabilidade

- JSON padrão tem limite explícito de 32 KiB; escrita de artigo, 256 KiB (`app.ts:41-47`). `express.urlencoded({ extended: true })` não define limite explícito no código e fica sujeito ao padrão do parser.
- Cada requisição recebe UUID em `X-Request-Id`; serialização do log mantém método, caminho sem query e status, sem serializar corpo, cookies ou headers (`app.ts:14-39`).
- Erros seguem `{ error: { code, key, message, requestId, ... } }` (`common/apiErrors.ts:7-22`). Parsing inválido mapeia a 400; corpo excessivo, 413; exceções não reconhecidas retornam mensagem genérica 500 e logam apenas nome/código (`app.ts:56-78`).
- A resposta 404 global é genérica (`app.ts:52-54`), compatível com a política de ocultar recursos bloqueados.
- A aplicação não registra configuração global de Helmet/CSP/HSTS/`X-Content-Type-Options`/`Referrer-Policy` nem desativa explicitamente `X-Powered-By` no `app.ts`. A rota de mídia adiciona `nosniff`; não se conclui que a borda externa não acrescente outros headers. Exigir inventário de headers na fronteira de hospedagem antes de qualquer lançamento.

### Inventário de cabeçalhos e cache observado

| Resposta/superfície | Cabeçalhos definidos pelo código |
|---|---|
| Todas as requisições | `X-Request-Id` (`app.ts:14-39`). |
| Sessão/cookies de autenticação | `Set-Cookie`/`clearCookie` com as opções documentadas em R2-02; não há cookie CSRF separado (`security/sessionCookies.ts:17-35`; `preAuthCookies.ts:12-20`). |
| Rate limit | `Retry-After` (`security/rateLimit.ts:24-30`). |
| Auth e rotas de exclusão | `Cache-Control: no-store` (`modules/auth/presentation/routes.ts:16-20`; `accountDeletionRoutes.ts:21-25`). |
| Token CSRF | `Cache-Control: no-store` (`security/csrf.ts:36-40`). |
| Mídia publicada | `Content-Type`, `Content-Length`, `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Accept-Ranges`, `Cache-Control: private, no-store` e `Content-Range` quando aplicável (`modules/media/presentation/mediaRoutes.ts:195-211`). |
| JSON de erro e JSON normal | O código usa `response.json`; não define política Cache-Control global. Express define os cabeçalhos de representação/transferência. |
| `X-Powered-By` | Não há `app.disable("x-powered-by")` no app; a configuração de código não o remove. Não foi feita captura HTTP para comprovar a resposta final. |

### Rotas GET com sessão, conta e perfil

Os caminhos abaixo são relativos aos routers indicados; a política `no-store` é explícita somente onde marcada. Não foi feita captura HTTP.

| Router e rota | Conteúdo | `Cache-Control` | Evidência |
|---|---|---|---|
| Auth `GET /csrf` | Token CSRF | `no-store` explícito | `auth/presentation/csrfRoutes.ts:9`; `security/csrf.ts:36-40` |
| Auth `GET /session` | Estado da sessão e conta autenticada | `no-store` herdado do router | `auth/presentation/sessionRoutes.ts:20-23`; `auth/presentation/routes.ts:16-20` |
| Auth `GET /sessions` | Sessões ativas | `no-store` herdado do router | `auth/presentation/sessionRoutes.ts:44-47`; `auth/presentation/routes.ts:16-20` |
| Auth `GET /devices` | Dispositivos confiáveis | `no-store` herdado do router | `auth/presentation/trustedDeviceRoutes.ts:16-20`; `auth/presentation/routes.ts:16-20` |
| Profiles `GET /accounts/me` | Perfil próprio | Nenhum explícito encontrado | `profiles/presentation/ownerProfileRoutes.ts:16-20` |
| Profiles `GET /accounts/me/privacy` | Configuração de privacidade | Nenhum explícito encontrado | `profiles/presentation/privacyRoutes.ts:13-17` |
| Profiles `GET /profiles/:username` | Perfil público | Nenhum explícito encontrado | `profiles/presentation/publicProfileRoutes.ts:16-20` |
| Profiles `GET /accounts/:accountId` | Perfil por UUID | Nenhum explícito encontrado | `profiles/presentation/publicProfileRoutes.ts:48-52` |
| Feed/Social `GET` feed, posts, comentários, busca e relações | Conteúdo e indicadores dependentes do viewer | Nenhum global explícito encontrado | `feed/presentation/globalFeedRoutes.ts:31-35`; sem política global em `app.ts:1-78` |

O feed e perfis incluem campos dependentes do viewer (`isLiked`, `isBookmarked`, relação, conteúdo privado aprovado). A ausência da diretiva é a evidência do achado 001, não prova de armazenamento indevido por um browser/proxy concreto.

## Validação e superfícies de URL

- Username é aparado e normalizado para minúsculas, restringido a 3–20 caracteres ASCII (`a-z`, `0-9`, `-`, `_`) (`shared/contracts/src/username.ts:6-15`). A regra de nomes reservados é aplicada na schema de cadastro/claim (`:17-24`).
- Hashtags são extraídas em formato delimitado, normalizadas sem diacríticos e deduplicadas; o limite é dez (`shared/contracts/src/feed/hashtags.ts:1-41`). Busca SQL usa parâmetros Drizzle; `_` é escapado no prefixo para não atuar como wildcard (`postRepository.ts:152-168`).
- Website é validado como URL HTTP/HTTPS, máximo 2.048 caracteres (`shared/contracts/src/social.ts:23-33`). A tela abre link externo com `target="_blank"` e `rel="noopener noreferrer"`; mapa recebe endereço codificado via `encodeURIComponent` (`CommercialProfileInformation.tsx:120-149,167-175`).
- Não foi localizado redirect controlado por usuário nem `fetch` server-side para URL fornecida por usuário nos módulos examinados; a chamada externa encontrada no backend aponta para endpoint fixo do provedor de e-mail. Isso limita a superfície SSRF observada nesta rodada, sem substituir uma revisão futura de novas integrações.

## Achados novos

### R2-05-001 — Leituras personalizadas não definem política explícita de cache

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** apenas Auth/CSRF/exclusão/mídia definem diretivas Cache-Control (`auth/presentation/routes.ts:16-20`; `security/csrf.ts:36-40`; `media/presentation/mediaRoutes.ts:203-209`); GET de feed responde sem header explícito (`feed/presentation/globalFeedRoutes.ts:84-92`).
- **Risco:** Baixo — respostas personalizadas não declaram a política pretendida; armazenamento/reuso indevido não foi demonstrado e permanece como condição futura a validar.

### R2-05-002 — A atribuição de IP depende da cadeia encaminhada e da borda ainda não especificada

- **Rodada 1:** amplia 11-005
- **Veredito:** PARCIAL
- **Evidência:** `front/src/server/forwarded-client-ip.ts:3-13` escolhe o último IP válido; `back/src/security/trustedClientIp.ts:7-23` aceita header interno só de loopback. A matriz sintética mostra que XFF forjado em um salto seria aceito se chegasse intacto ao Vite; a borda real não foi testada.
- **Risco:** Médio — XFF sem reescrita confiável pode permitir atribuição controlada pelo cliente; múltiplos saltos podem atribuir o IP de um proxy e compartilhar buckets.

### R2-05-003 — Headers globais de endurecimento não estão definidos no app

- **Rodada 1:** novo
- **Veredito:** PARCIAL
- **Evidência:** `back/src/app.ts:1-78` não instala política global de segurança de headers nem desativa `X-Powered-By`; `nosniff` é definido em `modules/media/presentation/mediaRoutes.ts:203-206`. A resposta final de uma hospedagem externa não foi capturada.
- **Risco:** Baixo — se não houver uma borda que aplique as políticas, faltará uma linha de base global; não se conclui que uma futura borda não o fará.

## Ações derivadas (não executadas nesta auditoria)

1. Definir política explícita de cache para respostas personalizadas e validá-la com captura HTTP antes da implantação.
2. Definir e testar a cadeia de proxies confiáveis e a limpeza de `X-Forwarded-For` na hospedagem escolhida.
3. Decidir se os headers globais pertencem ao app ou à borda e comprovar a resposta final nesse ambiente.

## R2-05 — Fechamento

- **Achados novos:** 3 (1 médio, 2 baixos; 2 exigem validação na hospedagem/deployment escolhido).
- **Matriz sintética:** 22/22 aprovada (9 testes unitários de função + 13 decisões compostas).
- **HTTP real:** não executado nesta seção; apenas tráfego não mutável seria permitido pelo roteiro, mas não era necessário para validar as funções puras.
- **Produção:** não testada nem presumida.
