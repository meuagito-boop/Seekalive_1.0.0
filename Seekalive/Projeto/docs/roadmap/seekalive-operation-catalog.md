# Catálogo de operações de referência

Gerado por `node docs/api/backend/generate-contracts.mjs`. Este registro de planejamento contém **146 operações** e não é o inventário de rotas montadas nem o contrato da API. IDs UUID são exemplos de formato, nunca IDs de catálogo mock.

> **Não normativo:** os estados e descrições deste catálogo são rótulos de planejamento e não classificam comportamento como ativo/validado. Para rotas realmente montadas, use `docs/api/backend/endpoints.md`; para o contrato HTTP, use `shared/api-spec/openapi.yaml`. Este arquivo não prova testes, persistência ou implantação.
> **Caminhos vigentes:** mídia usa `/v1/social/media` e `/v1/social/media/{assetId}`; salvar/remover publicação usa `/v1/social/posts/{postId}/bookmark`. Outros caminhos com estado `PROPOSTA` abaixo são ideias do roadmap, não contratos nem rotas atuais.
> **Regras vigentes que substituem qualquer conflito neste snapshot:** audiência `private` = titular e seguidores aprovados de perfil privado; Círculo exige seguimento mútuo; campos de apresentação e avaliações pertencem a Profiles; Seek apenas consome projeções públicas autorizadas e não cria nem edita avaliações.

## Respostas, paginação e autenticação

- GET normalmente responde `200`; login em instalação conhecida responde `200`, mas instalação desconhecida recebe desafio `202` sem sessão; troca de senha inicia com `202`; remoções sem corpo podem responder `204`.
- Página: `items` e `nextCursor` opaco ou null. Limite 20, máximo 100. Formato não substitui o contrato existente `Page<T>`.
- Erro: `{error:{code,message,requestId,details?,supportEmail?,retryAfterSeconds?,attemptsRemaining?,resendAvailableAt?}}`. Nunca serializar stack trace.
- Escritas autenticadas: cookie + `X-CSRF-Token`; POST com efeito recebe `Idempotency-Key` quando indicado na especificação de arquitetura.
- Não use os estados registrados abaixo para decidir se uma rota está montada ou funcionalmente validada. Essa informação é regenerada a partir do Express e do OpenAPI.

## Health

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/healthz` | Público | — | `Health` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/readyz` | Público | — | `Readiness` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |

## Auth

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/auth/session` | Público/sessão; ACL no servidor | — | `CurrentSession` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/auth/csrf` | Público/sessão; ACL no servidor | — | `Csrf` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/register` | Público | `RegisterRequest` | `RegistrationPending` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/login` | Público | `LoginRequest` | AuthResult (200) / DeviceVerificationRequired (202) | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/device-verification/confirm` | Público | `ChallengeConfirmRequest` | `AuthResult` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/device-verification/resend` | Público | `ChallengeResendRequest` | `DeviceVerificationResent` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/password/update` | Público | `PasswordPolicyUpdateRequest` | `PasswordUpdateChallenge` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/password/update/confirm` | Público | `ChallengeConfirmRequest` | `PasswordUpdated` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/auth/devices` | Sessão autenticada | — | `TrustedDeviceList` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| DELETE | `/v1/auth/devices/others` | Sessão autenticada | — | `OtherDevicesRevoked` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| DELETE | `/v1/auth/devices/{deviceId}` | Sessão autenticada | — | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/logout` | Sessão autenticada | — | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/auth/sessions` | Sessão autenticada | — | `PageSession` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| DELETE | `/v1/auth/sessions/others` | Sessão autenticada | — | `OtherSessionsRevoked` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| DELETE | `/v1/auth/sessions/{sessionId}` | Sessão autenticada | — | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/password/reset/request` | Público | `PasswordResetRequest` | `PasswordResetRequested` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/password/reset/confirm` | Público | `PasswordResetConfirm` | `PasswordResetComplete` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/verification` | Público/sessão; ACL no servidor | `VerificationRequest` | `Accepted` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/verification/confirm` | Público | `VerificationConfirm` | `VerificationConfirmation` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/account/email/change/request` | Sessão autenticada | `AccountEmailChangeRequest` | `EmailChangeCurrentCodeResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/account/email/change/confirm-current` | Sessão autenticada | `ChallengeConfirmInput` | `EmailChangeNewCodeResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/account/email/change/confirm-new` | Sessão autenticada | `ChallengeConfirmInput` | `AccountEmailChangeResult` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/account/password/change/request` | Sessão autenticada | `AccountPasswordChangeRequest` | `PasswordChangeCodeResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/account/password/change/confirm` | Sessão autenticada | `ChallengeConfirmInput` | `AccountPasswordChangeResult` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/account/deletion/code` | Sessão autenticada | `AccountDeletionCodeRequest` | `AccountDeletionCodeResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/account/deletion/confirm` | Sessão autenticada | `AccountDeletionConfirmation` | `AccountDeletionScheduled` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/auth/account/deletion/restore/code` | Cookie de pré-autenticação | `LoginRequest` | `AccountDeletionCodeResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO**; assíncrona |
| POST | `/v1/auth/account/deletion/restore/confirm` | Cookie de pré-autenticação | `AccountRestorationConfirmation` | `AccountRestoredResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |

## Onboarding

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| POST | `/v1/onboarding/interests` | Sessão autenticada | `OnboardingCompletionRequest` | `OnboardingCompletionResult` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |

## Accounts

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/accounts/me` | Sessão autenticada | — | `MyAccountResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| PATCH | `/v1/accounts/me` | Sessão autenticada | `AccountPatch` | `MyAccountResponse` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/accounts/availability` | Público | — | `Availability` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/accounts/{accountId}` | Público/sessão; ACL no servidor | — | `Account` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/profiles/{username}` | Público/sessão; ACL no servidor | — | `Profile` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| PUT | `/v1/accounts/me/preferences` | Sessão autenticada | `Preferences` | `Preferences` | **PROPOSTA** |
| GET | `/v1/accounts/me/preferences` | Sessão autenticada | — | `Preferences` | **PROPOSTA** |
| PUT | `/v1/accounts/me/onboarding` | Sessão autenticada | `Interests` | `Empty` | **PROPOSTA** |
| POST | `/v1/accounts/me/export` | Sessão autenticada | `Empty` | `Accepted` | **PROPOSTA**; assíncrona |
| GET | `/v1/accounts/me/export/{jobId}` | Sessão autenticada | — | `ExportJob` | **PROPOSTA** |
| GET | `/v1/accounts/{accountId}/media` | Público/sessão; ACL no servidor | — | `PageMedia` | **PROPOSTA** |
| GET | `/v1/accounts/{accountId}/business` | Público/sessão; ACL no servidor | — | `BusinessProfile` | **PROPOSTA** |
| PUT | `/v1/accounts/me/business` | Sessão autenticada | `BusinessWrite` | `BusinessProfile` | **PROPOSTA** |
| DELETE | `/v1/accounts/me/business` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/accounts/me/privacy` | Sessão autenticada | `PrivacyWrite` | `Privacy` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/accounts/me/privacy` | Sessão autenticada | — | `Privacy` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |

## Profiles

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/profiles/{username}/reviews` | Público/sessão; ACL no servidor | — | `BusinessProfileReviewPage` | **IMPLEMENTADA EM CÓDIGO; ESTADO FÍSICO DO BANCO NÃO ASSERTADO** |
| POST | `/v1/profiles/{username}/reviews` | Sessão autenticada | `BusinessProfileReviewCreate` | `BusinessProfileReviewCreated` | **IMPLEMENTADA EM CÓDIGO; ESTADO FÍSICO DO BANCO NÃO ASSERTADO** |
| DELETE | `/v1/profiles/{username}/reviews/me` | Sessão autenticada | — | `BusinessProfileReviewDeleted` | **IMPLEMENTADA EM CÓDIGO; ESTADO FÍSICO DO BANCO NÃO ASSERTADO** |
| PUT | `/v1/profiles/{username}/reviews/{reviewId}/reply` | Sessão autenticada | `BusinessProfileReviewReply` | `BusinessProfileReviewReplyResponse` | **IMPLEMENTADA EM CÓDIGO; ESTADO FÍSICO DO BANCO NÃO ASSERTADO** |

## Social

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/social/feed` | Sessão autenticada | — | `PagePost` | **PROPOSTA** |
| POST | `/v1/social/posts` | Sessão autenticada | `PostCreate` | `Post` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/posts/{postId}` | Público/sessão; ACL no servidor | — | `Post` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| PATCH | `/v1/social/posts/{postId}` | Sessão autenticada | `PostPatch` | `Post` | **PROPOSTA** |
| DELETE | `/v1/social/posts/{postId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| POST | `/v1/social/articles` | Sessão autenticada | `ArticleCreate` | `Post` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/articles/{postId}` | Público/sessão; ACL no servidor | — | `Post` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/posts/{postId}/reference` | Público/sessão; ACL no servidor | — | `SocialPostReferencePreview` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/posts/{postId}/comments` | Sessão autenticada | — | `PageComment` | **PROPOSTA** |
| POST | `/v1/social/posts/{postId}/comments` | Sessão autenticada | `CommentCreate` | `Comment` | **PROPOSTA** |
| PATCH | `/v1/social/comments/{commentId}` | Sessão autenticada | `CommentPatch` | `Comment` | **PROPOSTA** |
| DELETE | `/v1/social/comments/{commentId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/social/posts/{postId}/like` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| DELETE | `/v1/social/posts/{postId}/like` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| POST | `/v1/social/posts/{postId}/repost` | Sessão autenticada | — | `Repost` | **PROPOSTA** |
| DELETE | `/v1/social/posts/{postId}/repost` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/social/comments/{commentId}/like` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| DELETE | `/v1/social/comments/{commentId}/like` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| POST | `/v1/social/posts/{postId}/share-intents` | Sessão autenticada | — | `ShareIntent` | **PROPOSTA** |
| GET | `/v1/social/users/search` | Público/sessão; ACL no servidor | — | `PageAccount` | **PROPOSTA** |
| GET | `/v1/social/tags/search` | Público/sessão; ACL no servidor | — | `PageTag` | **PROPOSTA** |
| GET | `/v1/social/search` | Público/sessão; ACL no servidor | — | `SearchResults` | **PROPOSTA** |
| GET | `/v1/social/trends` | Público/sessão; ACL no servidor | — | `PageTrend` | **PROPOSTA** |
| GET | `/v1/references/{type}/{id}` | Público/sessão; ACL no servidor | — | `ReferencePreview` | **PROPOSTA** |
| GET | `/v1/social/activity` | Sessão autenticada | — | `PageActivity` | **PROPOSTA** |
| DELETE | `/v1/social/activity/history` | Sessão autenticada | — | `Empty` | **PROPOSTA** |

## Relations

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/social/accounts/{accountId}/followers` | Público/sessão; ACL no servidor | — | `PageAccount` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/accounts/{accountId}/following` | Público/sessão; ACL no servidor | — | `PageAccount` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| PUT | `/v1/social/accounts/{accountId}/follow` | Sessão autenticada | `Empty` | `Follow` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| DELETE | `/v1/social/accounts/{accountId}/follow` | Sessão autenticada | — | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/follow-requests` | Sessão autenticada | — | `PageFollow` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/social/follow-requests/{accountId}/accept` | Sessão autenticada | — | `Follow` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| POST | `/v1/social/follow-requests/{accountId}/decline` | Sessão autenticada | — | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/circles` | Sessão autenticada | — | `PageCircle` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/blocks` | Sessão autenticada | — | `PageAccount` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| PUT | `/v1/social/blocks/{accountId}` | Sessão autenticada | `Empty` | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| DELETE | `/v1/social/blocks/{accountId}` | Sessão autenticada | — | `Empty` | **MONTADA EM CÓDIGO; COMPORTAMENTO NÃO VALIDADO** |
| GET | `/v1/social/mutes` | Sessão autenticada | — | `PageAccount` | **PROPOSTA** |
| PUT | `/v1/social/mutes/{accountId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| DELETE | `/v1/social/mutes/{accountId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/social/posts/{postId}/saved` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| DELETE | `/v1/social/posts/{postId}/saved` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| GET | `/v1/social/saved` | Sessão autenticada | — | `PageSaved` | **PROPOSTA** |

## Media

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| POST | `/v1/media/uploads` | Sessão autenticada | `UploadCreate` | `Upload` | **PROPOSTA** |
| POST | `/v1/media/{mediaId}/complete` | Sessão autenticada | — | `MediaAsset` | **PROPOSTA** |
| GET | `/v1/media/{mediaId}` | Sessão autenticada | — | `MediaAsset` | **PROPOSTA** |
| DELETE | `/v1/media/{mediaId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| GET | `/v1/media/{mediaId}/content` | Sessão autenticada | — | bytes/SSE | **PROPOSTA** |

## Seek

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/seek/cities` | Público/sessão; ACL no servidor | — | `PageCity` | **PROPOSTA** |
| GET | `/v1/seek/cities/{cityId}` | Público/sessão; ACL no servidor | — | `City` | **PROPOSTA** |
| GET | `/v1/seek/categories` | Público/sessão; ACL no servidor | — | `PageCategory` | **PROPOSTA** |
| GET | `/v1/seek/discover` | Público/sessão; ACL no servidor | — | `PageDiscovery` | **PROPOSTA** |
| GET | `/v1/seek/businesses/{accountId}` | Público/sessão; ACL no servidor | — | `BusinessProfile` | **PROPOSTA** |
| GET | `/v1/seek/events` | Público/sessão; ACL no servidor | — | `PageEvent` | **PROPOSTA** |
| POST | `/v1/seek/events` | Sessão autenticada | `EventCreate` | `Event` | **PROPOSTA** |
| GET | `/v1/seek/events/{eventId}` | Público/sessão; ACL no servidor | — | `Event` | **PROPOSTA** |
| PATCH | `/v1/seek/events/{eventId}` | Sessão autenticada | `EventPatch` | `Event` | **PROPOSTA** |
| POST | `/v1/seek/events/{eventId}/publish` | Sessão autenticada | — | `Event` | **PROPOSTA** |
| POST | `/v1/seek/events/{eventId}/cancel` | Sessão autenticada | — | `Event` | **PROPOSTA** |
| DELETE | `/v1/seek/events/{eventId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/seek/events/{eventId}/interest` | Sessão autenticada | — | `EventInterest` | **PROPOSTA** |
| DELETE | `/v1/seek/events/{eventId}/interest` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| POST | `/v1/geo/reverse` | Sessão autenticada | `GeoReverseRequest` | `GeoResolution` | **PROPOSTA** |

## Shop

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/shop/items` | Público/sessão; ACL no servidor | — | `PageShopItem` | **PROPOSTA** |
| GET | `/v1/shop/items/{itemId}` | Público/sessão; ACL no servidor | — | `ShopItem` | **PROPOSTA** |
| GET | `/v1/shop/stores` | Público/sessão; ACL no servidor | — | `PageStore` | **PROPOSTA** |
| GET | `/v1/shop/categories` | Público/sessão; ACL no servidor | — | `PageCategory` | **PROPOSTA** |
| GET | `/v1/accounts/me/shop/items` | Sessão autenticada | — | `PageShopItem` | **PROPOSTA** |
| POST | `/v1/accounts/me/shop/items` | Sessão autenticada | `ShopItemWrite` | `ShopItem` | **PROPOSTA** |
| PATCH | `/v1/shop/items/{itemId}` | Sessão autenticada | `ShopItemWrite` | `ShopItem` | **PROPOSTA** |
| DELETE | `/v1/shop/items/{itemId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/shop/items/{itemId}/saved` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| DELETE | `/v1/shop/items/{itemId}/saved` | Sessão autenticada | — | `Empty` | **PROPOSTA** |

## Messaging

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/conversations` | Sessão autenticada | — | `PageConversation` | **PROPOSTA** |
| POST | `/v1/conversations` | Sessão autenticada | `ConversationCreate` | `Conversation` | **PROPOSTA** |
| GET | `/v1/conversations/{conversationId}` | Sessão autenticada | — | `Conversation` | **PROPOSTA** |
| DELETE | `/v1/conversations/{conversationId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| GET | `/v1/conversations/{conversationId}/messages` | Sessão autenticada | — | `PageMessage` | **PROPOSTA** |
| POST | `/v1/conversations/{conversationId}/messages` | Sessão autenticada | `MessageCreate` | `Message` | **PROPOSTA** |
| PUT | `/v1/conversations/{conversationId}/read` | Sessão autenticada | `ReadReceipt` | `ReadReceipt` | **PROPOSTA** |
| GET | `/v1/stream` | Sessão autenticada | — | bytes/SSE | **PROPOSTA**; Server-Sent Events |

## Notifications

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/notifications` | Sessão autenticada | — | `PageNotification` | **PROPOSTA** |
| PUT | `/v1/notifications/{notificationId}/read` | Sessão autenticada | — | `Notification` | **PROPOSTA** |
| PUT | `/v1/notifications/read-all` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| GET | `/v1/notifications/preferences` | Sessão autenticada | — | `NotificationPreferences` | **PROPOSTA** |
| PUT | `/v1/notifications/preferences` | Sessão autenticada | `NotificationPreferences` | `NotificationPreferences` | **PROPOSTA** |
| POST | `/v1/notifications/push-subscriptions` | Sessão autenticada | `PushSubscription` | `Empty` | **PROPOSTA** |
| DELETE | `/v1/notifications/push-subscriptions/{subscriptionId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |

## Privacy

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| POST | `/v1/reports` | Sessão autenticada | `ReportCreate` | `ReportReceipt` | **PROPOSTA** |
| GET | `/v1/reports/{reportId}` | Sessão autenticada | — | `ReportReceipt` | **PROPOSTA** |
| POST | `/v1/privacy/requests` | Sessão autenticada | `PrivacyRequest` | `Accepted` | **PROPOSTA**; assíncrona |
| GET | `/v1/privacy/requests/{requestId}` | Sessão autenticada | — | `PrivacyJob` | **PROPOSTA** |

## Moderation

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/moderation/reports` | Sessão autenticada | — | `PageReport` | **PROPOSTA** |
| POST | `/v1/moderation/reports/{reportId}/actions` | Sessão autenticada | `ModerationAction` | `Report` | **PROPOSTA** |
| GET | `/v1/moderation/audit` | Sessão autenticada | — | `PageAudit` | **PROPOSTA** |

## Rotas intencionalmente não prometidas

Checkout, pagamento, assinatura, pedido, entrega, reserva de mesa, agendamento confirmado, ingresso e localização por raio não aparecem como recursos prontos nesta especificação. Se aprovados, serão uma fase e contratos separados. O Shop atual desabilita compra e os eventos atuais não recebem inscrições pagas.

