# R2-02 — Tokens, hashing, CSRF, cookies e ciclo de sessão

**Status:** análise estática concluída. Não foram enviados requests mutáveis e nenhuma suíte foi executada; o pré-voo global de testes permanece bloqueado (R2-01-001).

## 1. Geração e armazenamento de segredos de autenticação

| Artefato | Geração/armazenamento observado | Evidência |
|---|---|---|
| Token de sessão | 32 bytes via `crypto.randomBytes`, codificados base64url; banco recebe SHA-256 do token bruto. O valor bruto é enviado no cookie `__Host-seekalive_session`. | `Aplicativo/back/src/modules/auth/application/sessionMaterial.ts:6-18`; `Aplicativo/back/src/security/tokenHashing.ts:4-6`; `sessionCookies.ts:16-25`. |
| Token de dispositivo confiável | 32 bytes aleatórios; banco armazena hash SHA-256; o token bruto fica no cookie `__Host-seekalive_device`. | `emailVerification/confirmEmailVerification.ts:44-47,86-90`; `deviceVerificationRoutes.ts:42-55`; `tokenHashing.ts:4-6`. |
| Códigos OTP | Seis dígitos gerados por `crypto.randomInt(0, 1_000_000)`, com distribuição uniforme; não se observou geração por `Math.random`. O registro persistido é HMAC-SHA-256, separado por finalidade, conta e challenge. | `challenges/deviceLogin.ts:18-30`; `emailVerification/sendVerificationCode.ts:23-27`; `tokenHashing.ts:8-69`. |
| Comparação de hash | `timingSafeEqual` após comparar comprimentos; os hashes de código e token têm comprimento fixo. | `tokenHashing.ts:72-79`. |
| Segredo de assinatura | `SESSION_SECRET` precisa ter pelo menos 32 bytes; o módulo falha ao inicializar se estiver abaixo disso. O mesmo segredo é usado para HMAC dos códigos OTP e do CSRF pré-autenticação. O valor não foi lido. | `sessionConfig.ts:6-10`; `tokenHashing.ts:2-69`; `security/csrf.ts:4-10`. |
| Senha | Argon2id, `memoryCost=65.536 KiB`, `timeCost=3`, `parallelism=1`; hash dummy de placeholder usado como baseline de custo. | `application/passwordHashing.ts:1-15`. A avaliação de latência/concor­rência está em R2-10. |

Não foi encontrado armazenamento de token de sessão ou código OTP em texto puro nas partes inspecionadas. A conclusão é limitada ao código-fonte analisado; não houve inspeção de dados de usuários.

## 2. Matriz de challenge, tentativas e concorrência

| Fluxo | Prazo e máximo de tentativas | Concorrência e consumo | Resultado |
|---|---|---|---|
| Confirmação de e-mail | 10 minutos; 5 tentativas (`emailVerification/policy.ts:1-2`). | `FOR UPDATE` e incremento de tentativa na transação (`emailVerificationRepository.ts:76-120`). | Código inválido não ativa conta; verificação, ativação, dispositivo e sessão são transacionais (`confirmEmailVerification.ts:48-103`). |
| Login em instalação desconhecida | 10 minutos; 3 erros; reenvio após 30 s e, após o segundo erro, 90 s (`challenges/deviceLogin.ts:6-9`). | Titular e challenge são bloqueados com `FOR UPDATE`; contador é atualizado na transação (`deviceVerificationRepository.ts:38-60,80-101,130-181`). | No terceiro erro bloqueia a conta, revoga sessões/dispositivos e challenges de login; resposta 423 com suporte (`confirmDeviceLogin.ts:59-103`; `deviceVerificationRoutes.ts:56-62,82-92`). |
| Reset de senha | 10 minutos; 5 tentativas (`challenges/passwordReset.ts:5-21`; `confirmPasswordReset.ts:11`). | Titular usa `FOR UPDATE`; consumo é um `UPDATE` condicional a challenge não consumido/não expirado/abaixo do limite; tentativas são incrementadas em operação condicional (`passwordResetConfirmationRepository.ts:82-125`). | Senha, revogação de sessões/dispositivos e consumo de challenges relacionados ocorrem na mesma transação (`passwordResetConfirmationRepository.ts:127-180`). |
| Atualização obrigatória de senha | 10 minutos; 5 tentativas (`challenges/passwordUpdate.ts:5-14`). | Challenge bloqueado por `FOR UPDATE`; contador sobe por operação SQL na transação e material de senha é limpo nos estados de erro/consumo (`passwordUpdateConfirmationRepository.ts:52-115`). | Sucesso revoga sessões, dispositivos e challenges relacionados (`passwordUpdateConfirmationRepository.ts:147-189`). |
| Troca autenticada de senha | 10 minutos; 5 tentativas (`accountSecurity/policy.ts:1-5`). | Titular/challenge bloqueados na transação; tentativa é persistida sob lock (`passwordChangeConfirmationRepository.ts:18-78`). | Troca, revogação de sessões/dispositivos e consumo de challenges relacionados são transacionais (`passwordChangeConfirmationRepository.ts:124-169`). |
| Troca de e-mail — endereço atual e novo | 10 minutos; 5 tentativas por challenge; envio limitado por cooldown de 60 s (`accountSecurity/policy.ts:1-5`). | Challenge bloqueado; contagem persistida dentro da transação; esgotamento limpa o e-mail pendente (`emailChangeRepository.ts:119-196`; `confirmCurrentEmailChange.ts:55-104`; `confirmNewEmailChange.ts:46-96`). | O e-mail atual permanece até confirmação do novo; a alteração consome challenges relacionados e incrementa versão da conta. O aviso ao e-mail antigo ocorre após o commit (`confirmNewEmailChange.ts:88-130`). |
| Exclusão/restauração | 10 minutos; 3 tentativas (`requestAccountDeletionCode.ts:8-40`; `confirmAccountDeletion.ts:4`). | Conta/challenge bloqueados e tentativas serializadas na transação (`accountDeletionRepository.ts:97-174`). | Agendamento altera estado e revoga sessões; restauração usa challenge separado (`accountDeletionRepository.ts:177-218`; `confirmAccountRestoration.ts:1-24`). |

### Observação de política

O limite de três tentativas com bloqueio total da conta se aplica ao código de login em dispositivo desconhecido; outros OTPs têm seus próprios limites de challenge (por exemplo, 5 para verificação de e-mail e reset). Não encontrei, na revisão estática, uma regra única que bloqueie a conta após três erros em todos os tipos de challenge; não tratei isso como bug, pois a decisão do titular vinculou o bloqueio ao login novo.

## 3. CSRF e métodos de escrita

`requireCsrf` exige token de sessão ou token pré-autenticação HMAC. O token de sessão é validado contra o hash armazenado na sessão; antes da autenticação, um nonce em cookie `HttpOnly` é combinado com HMAC. Com `Origin` presente, compara esquema/host à origem esperada e recusa `Origin: null`; sem `Origin`, ainda exige token CSRF. Não há fallback de validação por `Referer`. Comparações são em tempo constante (`security/csrf.ts:9-60`).

O inventário AST dos routers de apresentação encontrou **51 rotas de escrita: 51 com `requireCsrf`, 0 sem**. Prefixo geral: `/api`; módulos em `modules/index.ts:13-19`. Abaixo, os caminhos locais são relativos ao prefixo do respectivo módulo.

| Módulo | Métodos e caminhos | CSRF |
|---|---|---|
| Auth (`/api/v1/auth`) | `POST /register`; `/login`; `/verification`; `/verification/confirm`; `/device-verification/confirm`; `/device-verification/resend`; `/password/reset/request`; `/password/reset/confirm`; `/password/update`; `/password/update/confirm`; `/account/password/change/request`; `/account/password/change/confirm`; `/account/email/change/request`; `/account/email/change/confirm-current`; `/account/email/change/confirm-new`; `/account/deletion/code`; `/account/deletion/confirm`; `/account/deletion/restore/code`; `/account/deletion/restore/confirm`; `/logout`; `DELETE /sessions/others`; `/sessions/:sessionId`; `/devices/others`; `/devices/:deviceId` | Sim em todas |
| Onboarding (`/api/v1/onboarding`) | `POST /interests` | Sim |
| Profiles (`/api/v1`) | `PATCH /accounts/me`; `PUT /accounts/me/privacy`; `POST /profiles/:username/reviews`; `DELETE /profiles/:username/reviews/me`; `PUT /profiles/:username/reviews/:reviewId/reply` | Sim em todas |
| Social (`/api/v1/social`) | `PUT /accounts/:accountId/follow`; `DELETE /accounts/:accountId/follow`; `POST /follow-requests/:accountId/accept`; `/follow-requests/:accountId/decline`; `PUT /blocks/:accountId`; `DELETE /blocks/:accountId` | Sim em todas |
| Feed (`/api/v1/social`) | `POST /articles`; `/posts`; `/posts/:postId/comments`; `/posts/:postId/repost`; `DELETE /posts/:postId`; `/posts/:postId/repost`; `/comments/:commentId`; `PUT` e `DELETE /posts/:postId/like`; `PUT` e `DELETE /posts/:postId/bookmark`; `PUT` e `DELETE /comments/:commentId/like` | Sim em todas |
| Media (`/api/v1/social`) | `POST /media`; `DELETE /media/:assetId` | Sim |

`GET /api/v1/auth/csrf` é uma rota de emissão/renovação do token, sem `requireCsrf`; não é um endpoint de mutação de domínio. Porém, para sessão ativa ele grava um novo hash CSRF na sessão em cada leitura (`csrfRoutes.ts:9-16`; `application/sessions/csrfSession.ts:11-16`). Requests concorrentes de token podem invalidar um token recém-retornado por outro request. Nenhum request mutável foi enviado nesta auditoria.

## 4. Cookies, autenticação e revogação

- **Sessão:** `__Host-seekalive_session`; `HttpOnly`, `Secure=true` incondicionalmente, `SameSite=Lax`, `Path=/`, sem `Domain`; `maxAge` é `SESSION_TTL_SECONDS` (padrão 7 dias, máximo 30 dias). Prefixo `__Host-` exige HTTPS (`sessionConfig.ts:1-3,12-16`; `sessionCookies.ts:9-20`).
- **Pré-autenticação:** `__Host-seekalive_pre_auth`; `HttpOnly`, `Secure=true`, `SameSite=Lax`, `Path=/`, sem `Domain`, `maxAge=15 min` (`sessionConfig.ts:2`; `preAuthCookies.ts:4-15`).
- **Dispositivo confiável:** `__Host-seekalive_device`; mesmos atributos e `maxAge=400 dias` (`sessionConfig.ts:3-4`; `sessionCookies.ts:27-31`).
- **CSRF:** não há cookie legível por JS nem cookie chamado CSRF. O token CSRF da sessão é devolvido no corpo de `GET /csrf` e seu hash é salvo na sessão; no pré-auth o token é HMAC de nonce guardado no cookie HttpOnly (`csrfRoutes.ts:9-27`; `csrf.ts:9-16,44-60`).
- A limpeza de sessão/dispositivo usa os atributos de definição (`sessionCookies.ts:16-36`). O cookie pré-auth é apagado diretamente em logout/login/confirmação; os trechos examinados repetem `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e sem `Domain` (`sessionRoutes.ts:184-199`; `emailVerificationRoutes.ts:86-108`; `deviceVerificationRoutes.ts:105-112`).
- Autenticação bem-sucedida cria material aleatório novo e apaga o cookie pré-auth, o que reduz risco de fixação de sessão (`sessionMaterial.ts:6-18`; `emailVerificationRoutes.ts:101-110`; `deviceVerificationRoutes.ts:105-115`; `loginRoutes.ts:156-168`).
- O limite simultâneo de sessões é aplicado serializando criação por conta, bloqueando as sessões ativas e revogando as mais antigas antes de inserir a nova (`sessionCreationRepository.ts:21-78`; regra de ordenação em `sessionPolicy.ts`). A tela/rotas permitem listar, revogar outras e revogar uma sessão individual; a sessão atual sai por logout (`sessionRoutes.ts:44-180`).
- Logout revoga o token da sessão e apaga sessão + pré-auth; mantém o cookie de dispositivo confiável (`sessionRoutes.ts:184-199`). Reset e troca de senha revogam todas as sessões/dispositivos na mesma transação da atualização da credencial (`passwordResetConfirmationRepository.ts:127-171`; `passwordChangeConfirmationRepository.ts:124-169`; `passwordUpdateConfirmationRepository.ts:147-169`).
- Troca de e-mail atualiza o e-mail confirmado, incrementa a versão da conta e consome challenges relacionados, mas não chama operações de revogação de sessão/dispositivo (`confirmNewEmailChange.ts:88-103`). `loadActiveSession` não valida versão da conta; sessões e dispositivos existentes continuam válidos (`security/activeSession.ts:13-53`). Essa política não está especificada no contrato de produto.
- A sessão tem validade absoluta configurável, padrão de 7 dias e teto de 30 dias; `loadActiveSession` valida expiração, mas não estende `expiresAt` ao uso (`sessionConfig.ts:12-16`; `activeSession.ts:39-44`). Isso é expiração absoluta, não um timer de inatividade.

## Achados

### R2-02-001 — Cookie persistente do dispositivo expira antes de revogação manual

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `security/sessionConfig.ts:3-4` define 400 dias e `security/sessionCookies.ts:27-31` aplica esse `maxAge`.
- **Risco:** Baixo — a instalação deixa de ser reconhecida após 400 dias mesmo sem revogação manual, divergindo da regra “até revogar”.

### R2-02-002 — Limites de tentativas variam entre finalidades

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** os limites variam por finalidade: 3 para login em dispositivo (`challenges/deviceLogin.ts:6-9`), 5 para e-mail/reset/update/troca e 3 para exclusão/restauração (tabela deste bloco).
- **Risco:** Informativo — não foi demonstrado bypass; UI e suporte precisam distinguir challenge encerrado de bloqueio da conta.

### R2-02-003 — Sessão tem expiração absoluta, não renovação deslizante

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `security/activeSession.ts:39-44` só valida `expiresAt`; não renova. `sessionConfig.ts:12-16` usa padrão de 7 dias e máximo de 30.
- **Risco:** Baixo — sessão usada continuamente ainda expira; o produto definiu ausência de limite por inatividade, mas não uma validade absoluta máxima.

### R2-02-004 — Emissão CSRF por GET substitui o token salvo na sessão

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `modules/auth/presentation/csrfRoutes.ts:9-16` chama a rotação no `GET /csrf`; `application/sessions/csrfSession.ts:11-16` gera outro token e persiste outro hash.
- **Risco:** Baixo — duas abas ou requests concorrentes podem invalidar um token CSRF recém-retornado e fazer uma escrita legítima falhar.

### R2-02-005 — Troca de e-mail mantém sessões e dispositivos existentes

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `application/emailChange/confirmNewEmailChange.ts:88-103` atualiza e-mail/versão e consome challenges sem revogar sessões; `security/activeSession.ts:13-53` não valida a versão da conta.
- **Risco:** Informativo — uma sessão previamente ativa continua autenticada após a troca; a regra do produto não definiu revogação nessa operação.

## Resumo R2-02

- **Achados novos:** 5 (0 críticos, 0 altos, 0 médios, 3 baixos, 2 informativos).
- **Validação:** estática, com caminhos e linhas citados; sem prova dinâmica por teste nesta rodada.
- **Ponto positivo verificado:** tokens de alta entropia não são armazenados em texto puro, hashes de OTP são HMAC, e as operações críticas examinadas usam transação/lock de challenge.
