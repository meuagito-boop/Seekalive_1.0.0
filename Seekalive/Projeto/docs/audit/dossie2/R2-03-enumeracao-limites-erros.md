# R2-03 — Enumeração, limites de envio, desafios pendentes e erros de Auth

**Status:** análise estática concluída; sem requests HTTP mutáveis e sem testes dinâmicos.

## Matriz de respostas e estados observados

As respostas abaixo foram derivadas das rotas e serviços versionados; não foram provocadas via HTTP nesta rodada. As rotas Auth passam pelo middleware `Cache-Control: no-store`; respostas da API incluem `X-Request-Id`; respostas `429` incluem `Retry-After`. O middleware global e seus formatos estão detalhados em R2-05.

| Fluxo / estado de entrada | Status e corpo observados no código | Cabeçalhos/enumeração |
|---|---|---|
| `POST /api/v1/auth/register`: payload inválido ou idade fora da regra | `400 VALIDATION_ERROR`; nenhum registro novo por idade inválida (`registrationRoutes.ts:24-26,108-116`). | `X-Request-Id`; Auth `no-store`. |
| Cadastro: @ já usado ou reservado | `409 USERNAME_UNAVAILABLE` (`registrationRoutes.ts:49-63,119-125,149-161`). | O @ é público; resposta diferencia sua disponibilidade, conforme requisito de unicidade social. |
| Cadastro: e-mail já existente, ativo ou pendente | `202 verification_required` com mensagem genérica; para e-mail pendente pode reenviar código; para ativo não retorna conflito (`registrationRoutes.ts:65-93,163-171`). | Mesmo código/corpo; há diferença de tempo porque o caso pendente aguarda o envio do e-mail e o ativo não (`registrationRoutes.ts:67-91`). |
| Cadastro: novo e-mail/@ e entrega não configurada | `503 EMAIL_DELIVERY_UNAVAILABLE`; declara que nenhuma conta foi criada (`registrationRoutes.ts:39-47`). | `X-Request-Id`; Auth `no-store`. |
| Cadastro: conta criada, envio falha | `503 EMAIL_DELIVERY_UNAVAILABLE`; a conta permanece `pending_verification` (`registrationRoutes.ts:95-147`). | Mesmo status do caso de provedor indisponível, mas estado no banco já foi criado. |
| Login: identificador inexistente ou senha incorreta | `401 INVALID_CREDENTIALS`, mesma chave/mensagem (`authenticateLogin.ts:69-75`; `loginRoutes.ts:40-47`). | Hash Argon2 dummy executado para conta inexistente; reduz diferença de custo, não prova igualdade de tempo. |
| Login: e-mail pendente/não verificado com senha correta | `403 EMAIL_NOT_VERIFIED`; nenhuma sessão criada (`authenticateLogin.ts:76-80`; `loginRoutes.ts:49-56`). | Estado é revelado somente após fornecer a senha válida. |
| Login: conta bloqueada, indisponível ou em exclusão | Bloqueada: `423 SECURITY_LOCKED` com suporte; status indisponível: `403 ACCOUNT_UNAVAILABLE`; em exclusão: `202 account_deletion_pending` com prazo e e-mail mascarado (`authenticateLogin.ts:82-88,112-121`; `loginRoutes.ts:58-81`). | O estado de exclusão é revelado após validar senha; Auth `no-store`. |
| Login: instalação desconhecida com credenciais válidas | `202 device_verification_required`, challenge, e-mail mascarado, expiração e próximo reenvio; falha de entrega/configuração `503 EMAIL_DELIVERY_UNAVAILABLE` (`loginRoutes.ts:110-152`). | Não expõe e-mail completo. |
| `POST /password/reset/request`: conta inexistente, inativa, não verificada ou bloqueada | `202 reset_requested` genérico; não cria challenge para estados inelegíveis (`requestPasswordReset.ts:13-23`; `passwordResetRoutes.ts:40-50`). | Atraso mínimo 200 ms; não existe prova de tempo constante entre todos os estados. |
| `GET /api/v1/accounts/availability`: username válido/inválido | Válido: `200 {available, normalizedUsername}`; inválido: `400 VALIDATION_ERROR`; limite: `429 RATE_LIMITED` (`accountAvailabilityRoutes.ts:11-29`). | Limite 30/min por chave de IP; revela apenas disponibilidade do @, não verifica e-mail. |
| Reenvio de confirmação de e-mail | `202 verification_required` e texto genérico se não há conta pendente ou se solicitação foi aceita; falha de entrega/configuração `503 EMAIL_DELIVERY_UNAVAILABLE` (`emailVerificationRoutes.ts:18-57`). | 3 solicitações/15 min por IP. |
| Restauração no prazo de exclusão | Requer identificador + senha válidos; após confirmação envia código e retorna `202 verification_code_sent`, e-mail mascarado e expiração. Senha inválida/conta que não está em exclusão: `401 INVALID_CREDENTIALS`; prazo encerrado: `409 ACCOUNT_UNAVAILABLE`; entrega: `503 EMAIL_DELIVERY_UNAVAILABLE` (`accountDeletionRoutes.ts:175-231`). | E-mail completo não é retornado. Confirmação de código inválido/expirado: `400 INVALID_VERIFICATION_CODE`; a senha é validada novamente (`accountDeletionRoutes.ts:235-280`). |

O contrato central de erros tem status HTTP e objeto `{ error: { code, key, message, requestId, ... } }`; validação mapeia somente caminho/campo e mensagem, sem stack trace no helper (`common/apiErrors.ts:7-35`). A forma final de erros inesperados depende do middleware global, analisado em R2-05.

## Limites e fluxo de e-mail

| Operação | Limite por IP na rota |
|---|---:|
| Cadastro | 5 / 15 min |
| Login | 10 / 15 min |
| Reenvio/confirmar e-mail | 3 / 15 min para reenvio; 10 / 15 min para confirmação |
| Reset de senha | 5 / 15 min para solicitação; 10 / 15 min para confirmação |
| Atualização obrigatória de senha | 5 / 15 min para iniciar; 10 / 15 min para confirmar |
| Login por dispositivo | 10 / 15 min para confirmar; 5 / 15 min para reenviar |

Evidência: `createAuthRateLimit` nas rotas citadas acima, além de restauração, exclusão, troca de credencial e disponibilidade. Os cooldowns de dispositivo são 30 s/90 s. Troca de e-mail/senha tem cooldown de 60 s e até 5 envios/hora por conta; reset tem cooldown de 60 s por challenge (`accountSecurity/policy.ts:1-5`; `challenges/passwordReset.ts:5-21`).

- `rateLimit.ts:5-33` guarda contadores em `Map` no processo atual, com chave por nome da operação + IP. Não há política uniforme de cota por destinatário para todos os envios nem armazenamento distribuído. Troca de e-mail/senha, reset e novo dispositivo possuem controles persistidos específicos; estes não substituem quota global contra abuso em todos os fluxos.
- Cadastro exige entrega configurada antes de criar a conta; depois da criação, se o provedor falhar, mantém a conta `pending_verification`, retorna `503` e informa que o código não foi enviado (`registrationRoutes.ts:39-47,95-147`). O usuário pode solicitar novo código pelo fluxo de reenvio.
- Reenvio de verificação persiste o hash do novo challenge e expira os anteriores antes do envio (`sendVerificationCode.ts:23-35`). Se o envio falha, o cliente recebe `503`; o challenge anterior já foi invalidado. A próxima tentativa substitui o challenge.
- Solicitação de reset dispara o envio sem aguardar sua conclusão (`requestPasswordReset.ts:25-44`); se falhar, tenta invalidar challenge e registra evento. A rota já respondeu/continuará a resposta genérica. A resposta não informa que o e-mail falhou, decisão que protege enumeração, mas pode deixar o usuário aguardando um código que não chegou.
- A troca de e-mail envia código ao novo endereço após a transação; em falha, invalida o challenge novo (`confirmCurrentEmailChange.ts:118-135`). O aviso ao e-mail anterior é posterior à mudança e uma falha é registrada sem reverter a operação (`confirmNewEmailChange.ts:116-130`).
- Bloqueio por terceiro erro de código de dispositivo limpa cookies de sessão e dispositivo e responde `423 SECURITY_LOCKED` com suporte, sem retornar valor OTP ou e-mail integral (`deviceVerificationRoutes.ts:56-62,82-92`).
- A nova tentativa substitui o challenge ativo da mesma finalidade; os fluxos mantêm no máximo um challenge vigente por finalidade, mas finalidades diferentes são independentes. O número exato depende do tipo de conta/challenge e não há limite global de challenges ativos por conta. Troca de e-mail usa etapas distintas para endereço atual e novo.
- Conta de cadastro não verificada é criada com estado `pending_verification` (`modules/accounts/infrastructure/accountRegistrationRepository.ts:59`). Não foi encontrado prazo de expiração/limpeza automática desse estado; enquanto a linha existir, username segue indisponível. O titular do mesmo e-mail pendente consegue solicitar reenvio no fluxo de verificação, em vez de criar uma segunda conta.
- `securityLockedAt` é preenchido no terceiro código errado no repositório do desafio de dispositivo (`deviceVerificationRepository.ts:130-151`). A busca por atribuições no backend encontrou esse ponto e não encontrou limpeza `securityLockedAt = null`, rota ou job de desbloqueio. A resposta atual orienta suporte, mas não há fluxo de desbloqueio implementado no backend. Não foi encontrado envio automático de e-mail de aviso no momento do bloqueio.

## Achados

### R2-03-001 — Rate limit depende da memória de um processo

- **Rodada 1:** amplia 03-010
- **Veredito:** CONFIRMADO
- **Evidência:** `security/rateLimit.ts:5-27` mantém contadores em `Map` no processo, sem store compartilhado.
- **Risco:** Baixo — em múltiplas instâncias, reinícios e balanceamento tornam cada quota por IP independente e reiniciam contadores.

### R2-03-002 — Solicitação de reset não comunica falha de entrega ao solicitante

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `requestPasswordReset.ts:25-44` envia sem aguardar e trata erro por log/invalidação; `passwordResetRoutes.ts:40-50` retorna resposta genérica.
- **Risco:** Baixo — indisponibilidade de e-mail pode deixar o usuário aguardando um código que nunca chegará, sem estado de entrega na resposta/UI.

### R2-03-003 — Limite por destinatário não demonstrado

- **Rodada 1:** amplia 03-010
- **Veredito:** PARCIAL
- **Evidência:** `rateLimit.ts:13-20` limita por operação+IP; `accountSecurity/policy.ts:1-5` e os desafios de reset/dispositivo têm controles persistidos específicos, mas não existe quota comum para todos os destinatários/fluxos.
- **Risco:** Baixo — rotação de IP ainda permite abuso de envios em fluxos sem quota de destino; projeto permanece em desenvolvimento.

### R2-03-004 — Bloqueio de conta não tem desbloqueio suportado no backend

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** `deviceVerificationRepository.ts:147-151` preenche `securityLockedAt`; busca no backend não localizou limpeza, rota ou job de desbloqueio; as rotas retornam suporte (`loginRoutes.ts:77-81`).
- **Risco:** Médio — depois de três códigos incorretos, o titular não pode recuperar acesso pelo aplicativo e depende de procedimento manual ainda não implementado.

### R2-03-005 — Cadastro não verificado pode reter o @ sem prazo demonstrado

- **Rodada 1:** novo
- **Veredito:** PARCIAL
- **Evidência:** criação define `pending_verification` (`modules/accounts/infrastructure/accountRegistrationRepository.ts:59`) e essa conta é tratada por reenvio (`registrationRoutes.ts:65-91`); não foi encontrado expurgo/expiração desse estado na busca do backend.
- **Risco:** Baixo — cadastro abandonado pode manter username indisponível indefinidamente; a conclusão sobre ausência de um job externo é limitada ao repositório auditado.

### R2-03-006 — Cadastro mantém códigos genéricos, mas o tempo pode distinguir estado do e-mail

- **Rodada 1:** novo
- **Veredito:** CONFIRMADO
- **Evidência:** conta pendente aguarda envio (`registrationRoutes.ts:67-86`), enquanto e-mail de conta ativa retorna a mesma resposta sem envio (`:87-92`); no reset existe apenas piso de 200 ms (`passwordResetRoutes.ts:21-50`).
- **Risco:** Baixo — com limitação por IP, medição repetida ainda pode sugerir se um e-mail tem cadastro pendente; o código/corpo iguais não garantem tempo constante.

## Resumo R2-03

- **Achados novos:** 6 (0 críticos, 0 altos, 1 médio, 5 baixos).
- **Pontos positivos verificados:** login compara hash dummy; reset e reenvio usam respostas genéricas por e-mail; fluxo de novo dispositivo não envia OTP antes da autenticação por senha; lockout informa suporte sem expor o código.
- **Limite da conclusão:** status/corpos foram confirmados no código, não por requests, porque o roteiro proíbe operações HTTP mutáveis nesta rodada.
