# Endpoints e contrato OpenAPI

Gerado por `node docs/api/backend/generate-contracts.mjs`. OpenAPI 3.1 em `openapi.json`: **138 operações candidatas**. IDs UUID são exemplos de formato, nunca IDs de catálogo mock.

> **ATIVA** significa que o handler existe no código. A alteração de instalações confiáveis ainda não foi aplicada ao banco principal de desenvolvimento (faltam `trusted_devices` e `accounts.security_locked_at`); esse fluxo foi testado somente em schema temporário. Não considerar operável no banco principal até aplicar a migração. Produção não foi alterada.

## Respostas, paginação e autenticação

- GET normalmente responde `200`; login em instalação conhecida responde `200`, mas instalação desconhecida recebe desafio `202` sem sessão; troca de senha inicia com `202`; remoções sem corpo podem responder `204`.
- Página: `items` e `nextCursor` opaco ou null. Limite 20, máximo 100. Formato não substitui o contrato existente `Page<T>`.
- Erro: `{error:{code,message,requestId,details?,supportEmail?,retryAfterSeconds?,attemptsRemaining?,resendAvailableAt?}}`. Nunca serializar stack trace.
- Escritas autenticadas: cookie + `X-CSRF-Token`; POST com efeito recebe `Idempotency-Key` quando indicado na especificação de arquitetura.
- Rota marcada `ACTIVA` existe hoje. Outras são propostas e requerem implementação, migração e testes.

## Health

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/healthz` | Público | — | `Health` | **ATIVA** |
| GET | `/readyz` | Público | — | `Readiness` | **ATIVA** |

## Auth

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/auth/session` | Público/sessão; ACL no servidor | — | `CurrentSession` | **ATIVA** |
| GET | `/v1/auth/csrf` | Público/sessão; ACL no servidor | — | `Csrf` | **ATIVA** |
| POST | `/v1/auth/register` | Público | `RegisterRequest` | `RegistrationPending` | **ATIVA**; assíncrona |
| POST | `/v1/auth/login` | Público | `LoginRequest` | AuthResult (200) / DeviceVerificationRequired (202) | **ATIVA** |
| POST | `/v1/auth/device-verification/confirm` | Público | `ChallengeConfirmRequest` | `AuthResult` | **ATIVA** |
| POST | `/v1/auth/device-verification/resend` | Público | `ChallengeResendRequest` | `DeviceVerificationResent` | **ATIVA** |
| POST | `/v1/auth/password/update` | Público | `PasswordPolicyUpdateRequest` | `PasswordUpdateChallenge` | **ATIVA**; assíncrona |
| POST | `/v1/auth/password/update/confirm` | Público | `ChallengeConfirmRequest` | `PasswordUpdated` | **ATIVA** |
| GET | `/v1/auth/devices` | Sessão autenticada | — | `TrustedDeviceList` | **ATIVA** |
| DELETE | `/v1/auth/devices/others` | Sessão autenticada | — | `OtherDevicesRevoked` | **ATIVA** |
| DELETE | `/v1/auth/devices/{deviceId}` | Sessão autenticada | — | `Empty` | **ATIVA** |
| POST | `/v1/auth/logout` | Sessão autenticada | — | `Empty` | **ATIVA** |
| GET | `/v1/auth/sessions` | Sessão autenticada | — | `PageSession` | **ATIVA** |
| DELETE | `/v1/auth/sessions/others` | Sessão autenticada | — | `OtherSessionsRevoked` | **ATIVA** |
| DELETE | `/v1/auth/sessions/{sessionId}` | Sessão autenticada | — | `Empty` | **ATIVA** |
| POST | `/v1/auth/password/reset/request` | Público | `PasswordResetRequest` | `PasswordResetRequested` | **ATIVA**; assíncrona |
| POST | `/v1/auth/password/reset/confirm` | Público | `PasswordResetConfirm` | `PasswordResetComplete` | **ATIVA** |
| POST | `/v1/auth/verification` | Público/sessão; ACL no servidor | `VerificationRequest` | `Accepted` | **ATIVA**; assíncrona |
| POST | `/v1/auth/verification/confirm` | Público | `VerificationConfirm` | `VerificationConfirmation` | **ATIVA** |

## Onboarding

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| POST | `/v1/onboarding/interests` | Sessão autenticada | `OnboardingCompletionRequest` | `OnboardingCompletionResult` | **ATIVA** |

## Accounts

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/accounts/me` | Sessão autenticada | — | `MyAccountResponse` | **ATIVA** |
| PATCH | `/v1/accounts/me` | Sessão autenticada | `AccountPatch` | `MyAccountResponse` | **ATIVA** |
| DELETE | `/v1/accounts/me` | Sessão autenticada | — | `Accepted` | **PROPOSTA**; assíncrona |
| GET | `/v1/accounts/availability` | Público | — | `Availability` | **ATIVA** |
| GET | `/v1/accounts/{accountId}` | Público/sessão; ACL no servidor | — | `Account` | **ATIVA** |
| GET | `/v1/profiles/{username}` | Público/sessão; ACL no servidor | — | `Profile` | **ATIVA** |
| PUT | `/v1/accounts/me/preferences` | Sessão autenticada | `Preferences` | `Preferences` | **PROPOSTA** |
| GET | `/v1/accounts/me/preferences` | Sessão autenticada | — | `Preferences` | **PROPOSTA** |
| PUT | `/v1/accounts/me/onboarding` | Sessão autenticada | `Interests` | `Empty` | **PROPOSTA** |
| POST | `/v1/accounts/me/export` | Sessão autenticada | `Empty` | `Accepted` | **PROPOSTA**; assíncrona |
| GET | `/v1/accounts/me/export/{jobId}` | Sessão autenticada | — | `ExportJob` | **PROPOSTA** |
| GET | `/v1/accounts/{accountId}/media` | Público/sessão; ACL no servidor | — | `PageMedia` | **PROPOSTA** |
| GET | `/v1/accounts/{accountId}/business` | Público/sessão; ACL no servidor | — | `BusinessProfile` | **PROPOSTA** |
| PUT | `/v1/accounts/me/business` | Sessão autenticada | `BusinessWrite` | `BusinessProfile` | **PROPOSTA** |
| DELETE | `/v1/accounts/me/business` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/accounts/me/privacy` | Sessão autenticada | `PrivacyWrite` | `Privacy` | **ATIVA** |
| GET | `/v1/accounts/me/privacy` | Sessão autenticada | — | `Privacy` | **ATIVA** |

## Social

| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |
|---|---|---|---|---|---|
| GET | `/v1/social/feed` | Sessão autenticada | — | `PagePost` | **PROPOSTA** |
| POST | `/v1/social/posts` | Sessão autenticada | `PostCreate` | `Post` | **PROPOSTA** |
| GET | `/v1/social/posts/{postId}` | Público/sessão; ACL no servidor | — | `Post` | **PROPOSTA** |
| PATCH | `/v1/social/posts/{postId}` | Sessão autenticada | `PostPatch` | `Post` | **PROPOSTA** |
| DELETE | `/v1/social/posts/{postId}` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| POST | `/v1/social/articles` | Sessão autenticada | `PostCreate` | `Post` | **PROPOSTA** |
| GET | `/v1/social/articles/{postId}` | Público/sessão; ACL no servidor | — | `Post` | **PROPOSTA** |
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
| GET | `/v1/social/accounts/{accountId}/followers` | Público/sessão; ACL no servidor | — | `PageAccount` | **ATIVA** |
| GET | `/v1/social/accounts/{accountId}/following` | Público/sessão; ACL no servidor | — | `PageAccount` | **ATIVA** |
| PUT | `/v1/social/accounts/{accountId}/follow` | Sessão autenticada | `Empty` | `Follow` | **ATIVA** |
| DELETE | `/v1/social/accounts/{accountId}/follow` | Sessão autenticada | — | `Empty` | **ATIVA** |
| GET | `/v1/social/follow-requests` | Sessão autenticada | — | `PageFollow` | **ATIVA** |
| POST | `/v1/social/follow-requests/{accountId}/accept` | Sessão autenticada | — | `Follow` | **ATIVA** |
| POST | `/v1/social/follow-requests/{accountId}/decline` | Sessão autenticada | — | `Empty` | **ATIVA** |
| GET | `/v1/social/circles` | Sessão autenticada | — | `PageCircle` | **ATIVA** |
| GET | `/v1/social/blocks` | Sessão autenticada | — | `PageAccount` | **ATIVA** |
| PUT | `/v1/social/blocks/{accountId}` | Sessão autenticada | `Empty` | `Empty` | **ATIVA** |
| DELETE | `/v1/social/blocks/{accountId}` | Sessão autenticada | — | `Empty` | **ATIVA** |
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
| GET | `/v1/seek/businesses/{accountId}/reviews` | Público/sessão; ACL no servidor | — | `PageReview` | **PROPOSTA** |
| PUT | `/v1/seek/businesses/{accountId}/reviews/me` | Sessão autenticada | `ReviewWrite` | `Review` | **PROPOSTA** |
| DELETE | `/v1/seek/businesses/{accountId}/reviews/me` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
| PUT | `/v1/seek/businesses/{accountId}/reviews/{reviewId}/reply` | Sessão autenticada | `ReviewReplyWrite` | `Review` | **PROPOSTA** |
| DELETE | `/v1/seek/businesses/{accountId}/reviews/{reviewId}/reply` | Sessão autenticada | — | `Empty` | **PROPOSTA** |
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

