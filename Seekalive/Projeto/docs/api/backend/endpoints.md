# Endpoints da API

Este inventário é gerado a partir do grafo de routers Express realmente montado e comparado com `shared/api-spec/openapi.yaml`. `ATIVA EM CÓDIGO` significa que o método HTTP foi registrado na aplicação; não afirma que todos os fluxos foram exercitados ou que há implantação em produção.

Rotas montadas: **76**. Rotas sem contrato: **0**. Contratos sem rota montada: **0**. Divergências de CSRF: **0**.

| Método | Endpoint | Acesso declarado | Entrada | Saída | Estado |
|---|---|---|---|---|---|
| DELETE | `/v1/auth/devices/{deviceId}` | __Host-seekalive_session + X-CSRF-Token | deviceId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/auth/devices/others` | __Host-seekalive_session + X-CSRF-Token | — | 200 (application/json: OtherDevicesRevoked) | ATIVA EM CÓDIGO |
| DELETE | `/v1/auth/sessions/{sessionId}` | __Host-seekalive_session + X-CSRF-Token | sessionId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/auth/sessions/others` | __Host-seekalive_session + X-CSRF-Token | — | 200 (application/json: OtherSessionsRevoked) | ATIVA EM CÓDIGO |
| DELETE | `/v1/profiles/{username}/reviews/me` | __Host-seekalive_session + X-CSRF-Token | username (path obrigatório; string, mín. 3, máx. 20) | 200 (application/json: BusinessProfileReviewDeleted) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/accounts/{accountId}/follow` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/blocks/{accountId}` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/comments/{commentId}` | __Host-seekalive_session + X-CSRF-Token | commentId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/comments/{commentId}/like` | __Host-seekalive_session + X-CSRF-Token | commentId (path obrigatório; string (uuid)) | 200 (application/json: Comment) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/media/{assetId}` | __Host-seekalive_session + X-CSRF-Token | assetId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}/bookmark` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}/like` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| DELETE | `/v1/social/posts/{postId}/repost` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| GET | `/healthz` | Não declarado | — | 200 (application/json: HealthStatus) | ATIVA EM CÓDIGO |
| GET | `/readyz` | Não declarado | — | 200 (application/json: ReadinessStatus) | ATIVA EM CÓDIGO |
| GET | `/v1/accounts/{accountId}` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)) | 200 (application/json: AccountView) | ATIVA EM CÓDIGO |
| GET | `/v1/accounts/availability` | Não declarado | username (query obrigatório; string, mín. 3, máx. 21) | 200 (application/json: AccountUsernameAvailability) | ATIVA EM CÓDIGO |
| GET | `/v1/accounts/me` | __Host-seekalive_session | — | 200 (application/json: MyAccountResponse) | ATIVA EM CÓDIGO |
| GET | `/v1/accounts/me/privacy` | __Host-seekalive_session | — | 200 (application/json: PrivacySettings) | ATIVA EM CÓDIGO |
| GET | `/v1/auth/csrf` | Não declarado | — | 200 (application/json: CsrfToken) | ATIVA EM CÓDIGO |
| GET | `/v1/auth/devices` | __Host-seekalive_session | — | 200 (application/json: TrustedDevicePage) | ATIVA EM CÓDIGO |
| GET | `/v1/auth/session` | __Host-seekalive_session ou visitante | — | 200 (application/json: CurrentSession) | ATIVA EM CÓDIGO |
| GET | `/v1/auth/sessions` | __Host-seekalive_session | cursor (query; string, máx. 16) | 200 (application/json: AuthSessionPage) | ATIVA EM CÓDIGO |
| GET | `/v1/profiles/{username}` | __Host-seekalive_session ou visitante | username (path obrigatório; string, mín. 3, máx. 20) | 200 (application/json: ProfileResponse) | ATIVA EM CÓDIGO |
| GET | `/v1/profiles/{username}/reviews` | __Host-seekalive_session ou visitante | username (path obrigatório; string, mín. 3, máx. 20); limit (query; integer, min 1, max 50); cursor (query; string, máx. 256) | 200 (application/json: BusinessProfileReviewPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/accounts` | __Host-seekalive_session | q (query obrigatório; string, mín. 2, máx. 80); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/accounts/{accountId}/followers` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/accounts/{accountId}/following` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: AccountPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/accounts/{accountId}/posts` | __Host-seekalive_session ou visitante | accountId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512); format (query; string) | 200 (application/json: PostPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/articles/{postId}` | __Host-seekalive_session ou visitante | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| GET | `/v1/social/blocks` | __Host-seekalive_session | — | 200 (application/json: AccountList) | ATIVA EM CÓDIGO |
| GET | `/v1/social/circles` | __Host-seekalive_session | limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: CirclePage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/feed` | __Host-seekalive_session ou visitante | tab (query; string); q (query; string, mín. 2, máx. 120); limit (query; integer, min 1, max 50); cursor (query; string, máx. 512) | 200 (application/json: FeedPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/follow-requests` | __Host-seekalive_session | limit (query; integer, min 1, max 100); cursor (query; string, máx. 32) | 200 (application/json: FollowRequestPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/media/{assetId}` | __Host-seekalive_session ou visitante | assetId (path obrigatório; string (uuid)); Range (header; string) | 200 (image/jpeg: string (binary); image/png: string (binary); image/gif: string (binary); image/webp: string (binary); image/avif: string (binary); video/mp4: string (binary); video/webm: string (binary)); 206 (sem corpo) | ATIVA EM CÓDIGO |
| GET | `/v1/social/posts/{postId}` | __Host-seekalive_session ou visitante | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| GET | `/v1/social/posts/{postId}/comments` | __Host-seekalive_session | postId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512) | 200 (application/json: CommentPage) | ATIVA EM CÓDIGO |
| GET | `/v1/social/posts/{postId}/reference` | __Host-seekalive_session ou visitante | postId (path obrigatório; string (uuid)) | 200 (application/json: ReferencePreview) | ATIVA EM CÓDIGO |
| PATCH | `/v1/accounts/me` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountPatch | 200 (application/json: MyAccountResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/code` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountDeletionCodeRequest | 202 (application/json: AccountDeletionCodeResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/confirm` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountDeletionConfirmation | 200 (application/json: AccountDeletionScheduled) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/restore/code` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: LoginRequest | 202 (application/json: AccountDeletionCodeResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/deletion/restore/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: AccountRestorationConfirmation | 200 (application/json: AccountRestoredResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/email/change/confirm-current` | __Host-seekalive_session + X-CSRF-Token | application/json: ChallengeConfirmInput | 202 (application/json: EmailChangeNewCodeResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/email/change/confirm-new` | __Host-seekalive_session + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: AccountEmailChangeResult) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/email/change/request` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountEmailChangeRequest | 202 (application/json: EmailChangeCurrentCodeResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/password/change/confirm` | __Host-seekalive_session + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: AccountPasswordChangeResult) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/account/password/change/request` | __Host-seekalive_session + X-CSRF-Token | application/json: AccountPasswordChangeRequest | 202 (application/json: PasswordChangeCodeResponse) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/device-verification/confirm` | __Host-seekalive_pre_auth + __Host-seekalive_device + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: AuthResult) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/device-verification/resend` | __Host-seekalive_pre_auth + __Host-seekalive_device + X-CSRF-Token | application/json: ChallengeResendInput | 200 (application/json: DeviceVerificationResent) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/login` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: LoginRequest | 200 (application/json: AuthResult); 202 (application/json: oneOf(DeviceVerificationRequired\|AccountDeletionPendingResponse)) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/logout` | __Host-seekalive_session + X-CSRF-Token ou __Host-seekalive_pre_auth + X-CSRF-Token | — | 204 (sem corpo) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/password/reset/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: PasswordResetConfirm | 200 (application/json: PasswordResetComplete) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/password/reset/request` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: PasswordResetRequest | 202 (application/json: PasswordResetRequested) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/password/update` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: PasswordPolicyUpdateRequest | 202 (application/json: PasswordUpdateChallenge) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/password/update/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: ChallengeConfirmInput | 200 (application/json: PasswordUpdated) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/register` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: RegisterRequest | 202 (application/json: VerificationRequired) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/verification` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: EmailVerificationRequest | 202 (application/json: VerificationRequired) | ATIVA EM CÓDIGO |
| POST | `/v1/auth/verification/confirm` | __Host-seekalive_pre_auth + X-CSRF-Token | application/json: EmailVerificationConfirm | 200 (application/json: EmailVerificationConfirmation) | ATIVA EM CÓDIGO |
| POST | `/v1/onboarding/interests` | __Host-seekalive_session + X-CSRF-Token | application/json: OnboardingInterestsRequest | 200 (application/json: OnboardingCompletionResult) | ATIVA EM CÓDIGO |
| POST | `/v1/profiles/{username}/reviews` | __Host-seekalive_session + X-CSRF-Token | username (path obrigatório; string, mín. 3, máx. 20); application/json: BusinessProfileReviewCreate | 201 (application/json: BusinessProfileReviewCreated) | ATIVA EM CÓDIGO |
| POST | `/v1/social/articles` | __Host-seekalive_session + X-CSRF-Token | application/json: ArticleCreate | 201 (application/json: Post) | ATIVA EM CÓDIGO |
| POST | `/v1/social/follow-requests/{accountId}/accept` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 200 (application/json: FollowState) | ATIVA EM CÓDIGO |
| POST | `/v1/social/follow-requests/{accountId}/decline` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| POST | `/v1/social/media` | __Host-seekalive_session + X-CSRF-Token | X-Seekalive-Media-Type (header obrigatório; string); application/octet-stream: string (binary) | 201 (application/json: MediaUpload) | ATIVA EM CÓDIGO |
| POST | `/v1/social/posts` | __Host-seekalive_session + X-CSRF-Token | application/json: PostCreate | 201 (application/json: Post) | ATIVA EM CÓDIGO |
| POST | `/v1/social/posts/{postId}/comments` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)); limit (query; integer, min 1, max 100); cursor (query; string, máx. 512); application/json: CommentCreate | 201 (application/json: Comment) | ATIVA EM CÓDIGO |
| POST | `/v1/social/posts/{postId}/repost` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| PUT | `/v1/accounts/me/privacy` | __Host-seekalive_session + X-CSRF-Token | application/json: PrivacySettingsWrite | 200 (application/json: PrivacySettings) | ATIVA EM CÓDIGO |
| PUT | `/v1/profiles/{username}/reviews/{reviewId}/reply` | __Host-seekalive_session + X-CSRF-Token | username (path obrigatório; string, mín. 3, máx. 20); reviewId (path obrigatório; string (uuid)); application/json: BusinessProfileReviewReply | 200 (application/json: BusinessProfileReviewReplyResponse) | ATIVA EM CÓDIGO |
| PUT | `/v1/social/accounts/{accountId}/follow` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 200 (application/json: FollowState) | ATIVA EM CÓDIGO |
| PUT | `/v1/social/blocks/{accountId}` | __Host-seekalive_session + X-CSRF-Token | accountId (path obrigatório; string (uuid)) | 204 (sem corpo) | ATIVA EM CÓDIGO |
| PUT | `/v1/social/comments/{commentId}/like` | __Host-seekalive_session + X-CSRF-Token | commentId (path obrigatório; string (uuid)) | 200 (application/json: Comment) | ATIVA EM CÓDIGO |
| PUT | `/v1/social/posts/{postId}/bookmark` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |
| PUT | `/v1/social/posts/{postId}/like` | __Host-seekalive_session + X-CSRF-Token | postId (path obrigatório; string (uuid)) | 200 (application/json: Post) | ATIVA EM CÓDIGO |

O teste `pnpm --filter @workspace/scripts run test:api-route-contract` falha se houver método/caminho registrado sem operação OpenAPI, operação OpenAPI sem registro Express, registro duplicado ou diferença entre middleware CSRF e declaração `csrfToken`.

