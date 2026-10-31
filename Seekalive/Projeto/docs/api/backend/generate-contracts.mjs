/**
 * Generates the non-normative planning catalog in docs/roadmap.
 * Mounted routes and the canonical HTTP contract are maintained separately.
 * This script does not add handlers or run database SQL.
 * Run: node docs/api/backend/generate-contracts.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const roadmapDir = resolve(dir, "../../roadmap");
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
// tag, method, path, summary, request schema, response schema, behavior
// "live" is reserved for endpoints verified in Aplicativo/back.
const R = [];
const add = (tag, method, path, summary, request, response, extra = {}) =>
  R.push({ tag, method, path, summary, request, response, ...extra });
const g = (tag, p, s, r, o, x) => add(tag, "get", p, s, null, r, x);
const post = (tag, p, s, r, o, x) => add(tag, "post", p, s, r, o, x);
const put = (tag, p, s, r, o, x) => add(tag, "put", p, s, r, o, x);
const patch = (tag, p, s, r, o, x) => add(tag, "patch", p, s, r, o, x);
const del = (tag, p, s, o, x) => add(tag, "delete", p, s, null, o, x);
const P = "PagePost",
  A = "Account",
  C = "Comment",
  N = "Notification";

g("health", "/healthz", "Verificar servidor (rota existente)", "Health", null, {
  status: "live",
  auth: "none",
});
g(
  "health",
  "/readyz",
  "Verificar disponibilidade do banco para atender solicitações",
  "Readiness",
  null,
  {
    status: "live",
    auth: "none",
    contractDescription:
      "Consulta SELECT 1 sem mutação; retorna 200 quando o banco está disponível e 503 quando não está.",
  },
);
g(
  "auth",
  "/v1/auth/session",
  "Consultar sessão atual sem revelar credenciais",
  "CurrentSession",
  null,
  { auth: "optional", status: "live" },
);
g(
  "auth",
  "/v1/auth/csrf",
  "Emitir desafio CSRF para a origem atual",
  "Csrf",
  null,
  {
    auth: "optional",
    status: "live",
    contractDescription:
      "Retorna token CSRF legível pelo cliente e emite cookie pré-autenticação opaco, Secure/HttpOnly/SameSite; o token deve ser validado contra esse contexto ou sessão.",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Cookie pré-autenticação opaco, limitado à origem, curto e sem permissões de sessão.",
        schema: { type: "string" },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/register",
  "Criar conta Social e solicitar verificação de e-mail",
  "RegisterRequest",
  "RegistrationPending",
  {
    auth: "none",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Com envio de e-mail configurado, cria uma identidade Social pendente e, para conta comercial, sua extensão comercial na mesma transação; envia código de seis dígitos, sem emitir sessão. Sem provedor de e-mail, retorna 503 e não cria conta. A resposta 202 é genérica e não revela se o e-mail já está cadastrado.",
  },
);
post(
  "auth",
  "/v1/auth/login",
  "Autenticar por nome de usuário ou e-mail e senha",
  "LoginRequest",
  "AuthResult",
  {
    auth: "none",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    responseVariants: "AuthResult (200) / DeviceVerificationRequired (202)",
    contractDescription:
      "Normaliza o identificador e só autentica após senha válida, e-mail confirmado, conta ativa e política atual. Se o cookie de instalação confiável não tiver um token ativo para a conta, responde 202, envia código ao e-mail verificado e não cria sessão até a confirmação. IP não identifica instalações nem é persistido; pode ser usado transitoriamente pelo limitador de abuso. Senhas legadas compatíveis são promovidas; as demais recebem 403 PASSWORD_UPDATE_REQUIRED. Erros de usuário/senha inválidos são genéricos. Nunca retorna segredo no corpo.",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Sessão opaca em __Host-seekalive_session e token da instalação em __Host-seekalive_device; ambos Secure, HttpOnly, SameSite=Lax e Path=/.",
        schema: { type: "string" },
      },
    },
    additionalSuccessResponses: {
      202: {
        description:
          "Senha aceita em uma instalação não reconhecida. Não cria sessão; inicia a confirmação por e-mail.",
        content: {
          "application/json": { schema: ref("DeviceVerificationRequired") },
        },
        headers: {
          "Set-Cookie": {
            description:
              "Cookie temporário da instalação pendente; só se torna confiável depois da confirmação do código.",
            schema: { type: "string" },
          },
        },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/device-verification/confirm",
  "Confirmar uma instalação com o código enviado por e-mail",
  "ChallengeConfirmRequest",
  "AuthResult",
  {
    auth: "none",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    contractDescription:
      "Código de seis dígitos expira em 10 minutos. Registra a instalação apenas depois da confirmação e cria a sessão na mesma transação. O primeiro código incorreto inicia espera de 30 s para reenvio; o segundo, 90 s; no terceiro erro a conta é bloqueada e as sessões/instalações são revogadas. O IP não participa da decisão de confiança.",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Cria cookie de sessão e mantém o token da instalação confirmada; remove o cookie pré-autenticação.",
        schema: { type: "string" },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/device-verification/resend",
  "Reenviar código de confirmação da instalação",
  "ChallengeResendRequest",
  "DeviceVerificationResent",
  {
    auth: "none",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    contractDescription:
      "Exige o mesmo cookie temporário da instalação e o desafio ativo. Mantém a contagem de erros; aplica o intervalo atual de 30 s ou 90 s e expira o código 10 minutos após o envio. Limitado a cinco reenvios por IP em 15 minutos.",
  },
);
post(
  "auth",
  "/v1/auth/password/update",
  "Solicitar troca de senha com senha atual e código de e-mail",
  "PasswordPolicyUpdateRequest",
  "PasswordUpdateChallenge",
  {
    auth: "none",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Verifica senha atual, conta ativa, e-mail confirmado e política da nova senha. Não altera a credencial ainda: envia código de seis dígitos ao e-mail atual e retorna 202. O desafio expira em 10 minutos e permite cinco erros.",
  },
);
post(
  "auth",
  "/v1/auth/password/update/confirm",
  "Confirmar troca de senha e revogar instalações confiáveis",
  "ChallengeConfirmRequest",
  "PasswordUpdated",
  {
    auth: "none",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    contractDescription:
      "Ao validar o código, grava o hash Argon2id e revoga na mesma transação todas as sessões e instalações confiáveis. Exige novo login e nova confirmação de instalação. Limpa os cookies de sessão e instalação atuais.",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Expira os cookies __Host-seekalive_session e __Host-seekalive_device.",
        schema: { type: "string" },
      },
    },
  },
);
g(
  "auth",
  "/v1/auth/devices",
  "Listar instalações confiáveis da própria conta",
  "TrustedDeviceList",
  null,
  {
    auth: "required",
    status: "live",
    contractDescription:
      "Retorna até 100 instalações ativas com primeiro/último acesso e indicação da atual. Não retorna IP, user-agent ou impressão digital.",
  },
);
del(
  "auth",
  "/v1/auth/devices/others",
  "Revogar as outras instalações confiáveis",
  "OtherDevicesRevoked",
  {
    auth: "required",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    contractDescription:
      "Revoga instalações e sessões vinculadas, preservando a instalação e sessão atuais.",
  },
);
del(
  "auth",
  "/v1/auth/devices/{deviceId}",
  "Revogar uma instalação confiável",
  "Empty",
  {
    auth: "required",
    csrfOnly: true,
    successCode: "204",
    status: "live",
    contractDescription:
      "Revoga somente instalação pertencente à conta autenticada e encerra as sessões vinculadas. Se for a instalação atual, encerra a sessão e expira seus cookies; IDs alheios ou inexistentes respondem 404.",
  },
);
post(
  "auth",
  "/v1/auth/logout",
  "Encerrar e revogar a sessão atual",
  null,
  "Empty",
  {
    successCode: "204",
    status: "live",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Expira __Host-seekalive_session no mesmo Path e atributos do cookie emitido no login.",
        schema: { type: "string" },
      },
    },
  },
);
g(
  "auth",
  "/v1/auth/sessions",
  "Listar sessões próprias ativas",
  "PageSession",
  null,
  {
    status: "live",
    auth: "required",
    query: ["cursor"],
    contractDescription:
      "Lista somente sessões ativas da conta autenticada, com página fixa de 20 itens e cursor opaco. Cada item informa ID, criação, expiração e se é a sessão atual; cada sessão está vinculada a uma instalação confiável. A resposta não expõe IP, user-agent ou impressão digital.",
  },
);
del(
  "auth",
  "/v1/auth/sessions/others",
  "Revogar todas as outras sessões",
  "OtherSessionsRevoked",
  {
    status: "live",
    auth: "required",
    csrfOnly: true,
    successCode: "200",
    contractDescription:
      "Revoga atomicamente todas as sessões ativas da própria conta, preservando a sessão autenticada que fez o pedido. Repetir a operação é seguro e retorna zero quando não há outras sessões.",
  },
);
del(
  "auth",
  "/v1/auth/sessions/{sessionId}",
  "Revogar uma sessão própria",
  "Empty",
  {
    status: "live",
    auth: "required",
    csrfOnly: true,
    successCode: "204",
    contractDescription:
      "Revoga somente uma sessão ativa pertencente à conta autenticada. IDs de outras contas são indistinguíveis de IDs inexistentes (404); a sessão atual deve ser encerrada pelo endpoint de logout.",
  },
);
post(
  "auth",
  "/v1/auth/password/reset/request",
  "Solicitar código para redefinir a senha",
  "PasswordResetRequest",
  "PasswordResetRequested",
  {
    auth: "none",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Retorna a mesma resposta 202 e aplica um piso de 200 ms para e-mail inexistente, não verificado, elegível ou limitado por conta. Só contas ativas e com e-mail verificado recebem o código; se a entrega não estiver configurada, a resposta genérica permanece igual, sem envio. O desafio é HMAC-SHA256, expira em 10 minutos, permite cinco tentativas e só pode ser consumido uma vez. Limites: cinco pedidos por IP em 15 minutos, intervalo de 60 segundos e até cinco pedidos por conta/hora; o limite por IP retorna 429. A entrega é iniciada após a resposta para não expor latência do provedor; sem outbox durável, falha invalida o código e a pessoa pode tentar novamente após o intervalo.",
  },
);
post(
  "auth",
  "/v1/auth/password/reset/confirm",
  "Redefinir a senha com código válido",
  "PasswordResetConfirm",
  "PasswordResetComplete",
  {
    auth: "none",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    contractDescription:
      "Exige e-mail da conta, código de seis dígitos válido e senha dentro da política atual. Consome o código uma única vez, grava Argon2id e revoga todas as sessões e instalações confiáveis na mesma transação. Não cria sessão; o usuário entra novamente e confirma a instalação. Códigos inválidos, expirados, esgotados, reutilizados ou de contas não elegíveis retornam o mesmo erro.",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Expira os cookies __Host-seekalive_session e __Host-seekalive_device.",
        schema: { type: "string" },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/verification",
  "Solicitar ou reenviar verificação de e-mail",
  "VerificationRequest",
  "Accepted",
  {
    auth: "optional",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Aceita o e-mail informado e não confirma se existe conta. Sem provedor de e-mail, retorna 503 sem enviar código.",
  },
);
post(
  "auth",
  "/v1/auth/verification/confirm",
  "Confirmar desafio de e-mail de uso único",
  "VerificationConfirm",
  "VerificationConfirmation",
  {
    auth: "none",
    csrfOnly: true,
    successCode: "200",
    status: "live",
    contractDescription:
      "Valida o código de seis dígitos de uso único, marca o e-mail como confirmado e ativa a conta na mesma transação. Conta atual recebe sessão e registra a instalação atual como confiável; conta legada sem versão de senha recebe passwordUpdateRequired=true, sem sessão.",
    responseHeaders: {
      "Set-Cookie": {
        description:
          "Sessão opaca criada/rotacionada pela API em cookie __Host-seekalive_session Secure, HttpOnly, SameSite=Lax e Path=/.",
        schema: { type: "string" },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/account/email/change/request",
  "Iniciar troca de e-mail com senha atual",
  "AccountEmailChangeRequest",
  "EmailChangeCurrentCodeResponse",
  {
    auth: "required",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Exige senha atual e envia código ao e-mail verificado atual. O endereço atual permanece ativo até que o novo e-mail também seja confirmado.",
  },
);
post(
  "auth",
  "/v1/auth/account/email/change/confirm-current",
  "Confirmar acesso ao e-mail atual",
  "ChallengeConfirmInput",
  "EmailChangeNewCodeResponse",
  {
    auth: "required",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Valida o código enviado ao endereço atual e então envia o segundo código ao novo endereço proposto.",
  },
);
post(
  "auth",
  "/v1/auth/account/email/change/confirm-new",
  "Confirmar e ativar o novo e-mail",
  "ChallengeConfirmInput",
  "AccountEmailChangeResult",
  {
    auth: "required",
    csrfOnly: true,
    status: "live",
    contractDescription:
      "Ativa o novo endereço somente após confirmar seu código e envia um aviso de segurança ao endereço anterior.",
  },
);
post(
  "auth",
  "/v1/auth/account/password/change/request",
  "Iniciar troca de senha com a senha atual",
  "AccountPasswordChangeRequest",
  "PasswordChangeCodeResponse",
  {
    auth: "required",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Exige senha atual, valida a política da nova senha e envia código ao e-mail verificado. A senha não muda até a confirmação do código.",
  },
);
post(
  "auth",
  "/v1/auth/account/password/change/confirm",
  "Confirmar troca de senha e revogar instalações",
  "ChallengeConfirmInput",
  "AccountPasswordChangeResult",
  {
    auth: "required",
    csrfOnly: true,
    status: "live",
    contractDescription:
      "Atualiza a senha e revoga, na mesma transação, as sessões e instalações confiáveis. Exige novo login e confirmação da instalação.",
    responseHeaders: {
      "Set-Cookie": {
        description: "Expira os cookies de sessão e instalação atuais.",
        schema: { type: "string" },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/account/deletion/code",
  "Solicitar código para pedir exclusão da conta",
  "AccountDeletionCodeRequest",
  "AccountDeletionCodeResponse",
  {
    auth: "required",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Exige sessão ativa e e-mail verificado. Envia somente o código de uso único; a solicitação não dispara outro e-mail.",
  },
);
post(
  "auth",
  "/v1/auth/account/deletion/confirm",
  "Confirmar e agendar a exclusão da conta",
  "AccountDeletionConfirmation",
  "AccountDeletionScheduled",
  {
    auth: "required",
    csrfOnly: true,
    status: "live",
    contractDescription:
      "Oculta e desativa a conta imediatamente, revoga sessões e permite restauração somente durante sete dias. Depois, os registros permanecem retidos por mais 90 dias antes da remoção física.",
    responseHeaders: {
      "Set-Cookie": {
        description: "Expira os cookies de sessão e instalação atuais.",
        schema: { type: "string" },
      },
    },
  },
);
post(
  "auth",
  "/v1/auth/account/deletion/restore/code",
  "Solicitar código para restaurar conta pendente",
  "LoginRequest",
  "AccountDeletionCodeResponse",
  {
    auth: "preAuth",
    csrfOnly: true,
    accepted: true,
    status: "live",
    contractDescription:
      "Exige identificador, senha e o contexto de pré-autenticação. Disponível apenas durante os sete dias de restauração; envia o código ao e-mail verificado da conta.",
  },
);
post(
  "auth",
  "/v1/auth/account/deletion/restore/confirm",
  "Restaurar conta com senha e código de e-mail",
  "AccountRestorationConfirmation",
  "AccountRestoredResponse",
  {
    auth: "preAuth",
    csrfOnly: true,
    status: "live",
    contractDescription:
      "Exige identificador, senha, código e contexto de pré-autenticação. Restaura a conta somente dentro dos sete dias e não cria sessão; a pessoa deve entrar novamente.",
  },
);
post(
  "onboarding",
  "/v1/onboarding/interests",
  "Salvar ou pular interesses do onboarding",
  "OnboardingCompletionRequest",
  "OnboardingCompletionResult",
  {
    status: "live",
    contractDescription:
      "Requer sessão ativa e e-mail verificado. Substitui as escolhas anteriores e marca o onboarding como concluído; pular salva uma lista vazia, mas também conclui a etapa.",
  },
);

g(
  "accounts",
  "/v1/accounts/me",
  "Consultar conta e dados privados do titular",
  "MyAccountResponse",
  null,
  {
    status: "live",
    contractDescription:
      "Retorna dados de cadastro e e-mail verificado somente para a sessão ativa da própria conta. E-mail, idade, nomes pessoais e endereço comercial não aparecem em perfis públicos.",
  },
);
patch(
  "accounts",
  "/v1/accounts/me",
  "Editar dados próprios conforme o tipo de conta, com controle de versão",
  "AccountPatch",
  "MyAccountResponse",
  {
    status: "live",
    contractDescription:
      "Atualiza username e dados de perfil com controle de versão. Idade é coletada somente no cadastro e não é retornada nem editável após a criação. Contas pessoais enviam nome e sobrenome juntos, com nome público total de até 100 caracteres; contas comerciais podem atualizar o nome público e o endereço completo. Conta e extensão comercial são atualizadas na mesma transação; campos de outro tipo de conta são rejeitados.",
  },
);
g(
  "accounts",
  "/v1/accounts/availability",
  "Verificar disponibilidade pública de username",
  "Availability",
  null,
  {
    query: ["username"],
    requiredQuery: ["username"],
    auth: "none",
    status: "live",
  },
);
g(
  "accounts",
  "/v1/accounts/{accountId}",
  "Consultar perfil por identificador respeitando privacidade e bloqueios",
  A,
  null,
  { auth: "optional", status: "live" },
);
g(
  "accounts",
  "/v1/profiles/{username}",
  "Resolver perfil por username respeitando privacidade e bloqueios",
  "Profile",
  null,
  {
    auth: "optional",
    status: "live",
    contractDescription:
      "Retorna detalhes comerciais persistidos somente se o perfil comercial estiver visível para o visitante. Avaliações são consultadas separadamente no domínio Profiles; horários, serviços e galeria não são inventados nem incluídos enquanto não estiverem implementados.",
  },
);
g(
  "profiles",
  "/v1/profiles/{username}/reviews",
  "Listar avaliações do perfil comercial e seu resumo",
  "BusinessProfileReviewPage",
  null,
  {
    query: ["limit", "cursor"],
    auth: "optional",
    status: "implemented",
    contractDescription:
      "Handler implementado em código. Avaliações pertencem ao perfil comercial em Profiles; Seek pode consumir somente o agregado autorizado. O inventário confirma o registro da rota, não sua persistência física nem execução ponta a ponta.",
  },
);
post(
  "profiles",
  "/v1/profiles/{username}/reviews",
  "Publicar avaliação em perfil comercial",
  "BusinessProfileReviewCreate",
  "BusinessProfileReviewCreated",
  {
    auth: "required",
    csrfOnly: true,
    successCode: "201",
    status: "implemented",
    contractDescription:
      "Handler implementado em código; a migration Profiles 0003 ainda não foi aplicada e o fluxo HTTP não foi validado. Exige conta pessoal ativa e verificada. Permite uma avaliação ativa por pessoa e perfil comercial; o titular não pode avaliar a própria conta. A nota é de 1 a 5 e o comentário tem de 10 a 500 caracteres.",
  },
);
del(
  "profiles",
  "/v1/profiles/{username}/reviews/me",
  "Excluir a avaliação própria",
  "BusinessProfileReviewDeleted",
  {
    auth: "required",
    csrfOnly: true,
    successCode: "200",
    status: "implemented",
    contractDescription:
      "Handler implementado em código; a migration Profiles 0003 ainda não foi aplicada e o fluxo HTTP não foi validado. Exclui somente a avaliação da conta autenticada. Depois da exclusão, o autor pode publicar outra avaliação para o perfil.",
  },
);
put(
  "profiles",
  "/v1/profiles/{username}/reviews/{reviewId}/reply",
  "Publicar ou substituir resposta comercial à avaliação",
  "BusinessProfileReviewReply",
  "BusinessProfileReviewReplyResponse",
  {
    auth: "required",
    csrfOnly: true,
    status: "implemented",
    successCode: "200",
    contractDescription:
      "Handler implementado em código; a migration Profiles 0003 ainda não foi aplicada e o fluxo HTTP não foi validado. Somente o titular da conta comercial ativa e verificada pode responder. A resposta tem de 3 a 500 caracteres; uma resposta existente pode ser substituída.",
  },
);
put(
  "accounts",
  "/v1/accounts/me/preferences",
  "Substituir preferências próprias",
  "Preferences",
  "Preferences",
);
g(
  "accounts",
  "/v1/accounts/me/preferences",
  "Consultar preferências próprias",
  "Preferences",
);
put(
  "accounts",
  "/v1/accounts/me/onboarding",
  "Salvar interesses e concluir onboarding",
  "Interests",
  "Empty",
);
post(
  "accounts",
  "/v1/accounts/me/export",
  "Solicitar exportação autenticada",
  "Empty",
  "Accepted",
  { accepted: true },
);
g(
  "accounts",
  "/v1/accounts/me/export/{jobId}",
  "Consultar estado de exportação própria",
  "ExportJob",
);
g(
  "accounts",
  "/v1/accounts/{accountId}/media",
  "Listar galeria derivada das mídias autorizadas",
  "PageMedia",
  null,
  { auth: "optional" },
);
g(
  "accounts",
  "/v1/accounts/{accountId}/business",
  "Consultar extensão comercial pública",
  "BusinessProfile",
  null,
  { auth: "optional" },
);
put(
  "accounts",
  "/v1/accounts/me/business",
  "Criar ou atualizar extensão da mesma conta comercial",
  "BusinessWrite",
  "BusinessProfile",
);
del(
  "accounts",
  "/v1/accounts/me/business",
  "Arquivar extensão comercial própria",
  "Empty",
);
put(
  "accounts",
  "/v1/accounts/me/privacy",
  "Atualizar nível de privacidade, mensagens e confirmações de leitura",
  "PrivacyWrite",
  "Privacy",
  { status: "live" },
);
g(
  "accounts",
  "/v1/accounts/me/privacy",
  "Consultar permissões e privacidade próprias",
  "Privacy",
  null,
  { status: "live" },
);

g(
  "social",
  "/v1/social/feed",
  "Feed paginado e filtrado por visitante",
  P,
  null,
  { query: ["tab", "limit", "cursor"] },
);
post(
  "social",
  "/v1/social/posts",
  "Publicar texto ou mídia por IDs de uploads prontos",
  "PostCreate",
  "Post",
  { status: "live" },
);
g(
  "social",
  "/v1/social/posts/{postId}",
  "Ler publicação aplicando audiência e bloqueios",
  "Post",
  null,
  { auth: "optional", status: "live" },
);
patch(
  "social",
  "/v1/social/posts/{postId}",
  "Editar publicação própria com versão",
  "PostPatch",
  "Post",
);
del(
  "social",
  "/v1/social/posts/{postId}",
  "Remover publicação própria",
  "Empty",
);
post(
  "social",
  "/v1/social/articles",
  "Publicar artigo longo como publicação",
  "ArticleCreate",
  "Post",
  { status: "live" },
);
g(
  "social",
  "/v1/social/articles/{postId}",
  "Ler artigo como publicação",
  "Post",
  null,
  { auth: "optional", status: "live" },
);
g(
  "social",
  "/v1/social/posts/{postId}/reference",
  "Resolver prévia de publicação Social reaplicando audiência e bloqueios",
  "SocialPostReferencePreview",
  null,
  { auth: "optional", status: "live" },
);
g(
  "social",
  "/v1/social/posts/{postId}/comments",
  "Listar comentários legíveis da publicação",
  "PageComment",
  null,
  { query: ["cursor"] },
);
post(
  "social",
  "/v1/social/posts/{postId}/comments",
  "Comentar ou responder na mesma publicação",
  "CommentCreate",
  C,
);
patch(
  "social",
  "/v1/social/comments/{commentId}",
  "Editar comentário próprio com versão",
  "CommentPatch",
  C,
);
del(
  "social",
  "/v1/social/comments/{commentId}",
  "Remover comentário próprio",
  "Empty",
);
put(
  "social",
  "/v1/social/posts/{postId}/like",
  "Curtir publicação idempotentemente",
  null,
  "Empty",
);
del(
  "social",
  "/v1/social/posts/{postId}/like",
  "Descurtir publicação",
  "Empty",
);
post(
  "social",
  "/v1/social/posts/{postId}/repost",
  "Repostar publicação pública idempotentemente",
  null,
  "Repost",
);
del(
  "social",
  "/v1/social/posts/{postId}/repost",
  "Remover repost próprio",
  "Empty",
);
put(
  "social",
  "/v1/social/comments/{commentId}/like",
  "Curtir comentário legível",
  null,
  "Empty",
);
del(
  "social",
  "/v1/social/comments/{commentId}/like",
  "Descurtir comentário",
  "Empty",
);
post(
  "social",
  "/v1/social/posts/{postId}/share-intents",
  "Registrar intenção de compartilhar (não prova entrega externa)",
  null,
  "ShareIntent",
);
g(
  "social",
  "/v1/social/users/search",
  "Buscar apenas contas descobertas e legíveis",
  "PageAccount",
  null,
  { query: ["q", "limit", "cursor"], auth: "optional" },
);
g(
  "social",
  "/v1/social/tags/search",
  "Buscar hashtags públicas",
  "PageTag",
  null,
  { query: ["q", "limit", "cursor"], auth: "optional" },
);
g(
  "social",
  "/v1/social/search",
  "Busca unificada autorizada",
  "SearchResults",
  null,
  { query: ["q", "type", "limit", "cursor"], auth: "optional" },
);
g(
  "social",
  "/v1/social/trends",
  "Tendências agregadas sem expor conteúdo privado",
  "PageTrend",
  null,
  { query: ["cityId", "limit", "cursor"], auth: "optional" },
);
g(
  "social",
  "/v1/references/{type}/{id}",
  "Resolver prévia autorizada preservando autoria e destino",
  "ReferencePreview",
  null,
  { auth: "optional" },
);
g(
  "social",
  "/v1/social/activity",
  "Consultar atividade da conta atual",
  "PageActivity",
  null,
  { query: ["type", "limit", "cursor"] },
);
del(
  "social",
  "/v1/social/activity/history",
  "Limpar somente histórico de navegação/pesquisa próprio",
  "Empty",
);

g(
  "relations",
  "/v1/social/accounts/{accountId}/followers",
  "Listar seguidores visíveis",
  "PageAccount",
  null,
  { query: ["limit", "cursor"], auth: "optional", status: "live" },
);
g(
  "relations",
  "/v1/social/accounts/{accountId}/following",
  "Listar contas seguidas visíveis",
  "PageAccount",
  null,
  { query: ["limit", "cursor"], auth: "optional", status: "live" },
);
put(
  "relations",
  "/v1/social/accounts/{accountId}/follow",
  "Seguir ou pedir para seguir um perfil privado",
  "Empty",
  "Follow",
  { status: "live" },
);
del(
  "relations",
  "/v1/social/accounts/{accountId}/follow",
  "Deixar de seguir ou cancelar pedido",
  "Empty",
  { status: "live" },
);
g(
  "relations",
  "/v1/social/follow-requests",
  "Listar pedidos recebidos próprios",
  "PageFollow",
  null,
  { status: "live" },
);
post(
  "relations",
  "/v1/social/follow-requests/{accountId}/accept",
  "Aceitar pedido de seguimento recebido",
  null,
  "Follow",
  { status: "live" },
);
post(
  "relations",
  "/v1/social/follow-requests/{accountId}/decline",
  "Recusar pedido de seguimento recebido",
  null,
  "Empty",
  { status: "live" },
);
g(
  "relations",
  "/v1/social/circles",
  "Listar contas seguidas mutuamente; Círculo é derivado, sem convite próprio",
  "PageCircle",
  null,
  { query: ["cursor", "limit"], status: "live" },
);
g(
  "relations",
  "/v1/social/blocks",
  "Listar bloqueios próprios",
  "PageAccount",
  null,
  { status: "live" },
);
put(
  "relations",
  "/v1/social/blocks/{accountId}",
  "Bloquear conta e romper vínculos bilaterais",
  "Empty",
  "Empty",
  {
    status: "live",
    contractDescription:
      "Na mesma transação, grava o bloqueio iniciado pelo ator, remove follows aceitos e pedidos pendentes entre as duas contas nos dois sentidos e preserva conversas/mensagens para ocultá-las. Bloqueio de qualquer lado impede visibilidade e interação para ambos; somente o iniciador pode desbloquear.",
  },
);
del(
  "relations",
  "/v1/social/blocks/{accountId}",
  "Desbloquear sem recriar seguimentos ou pedidos",
  "Empty",
  {
    status: "live",
    contractDescription:
      "Somente o iniciador pode remover seu bloqueio. Não recria follows nem pedidos removidos; mensagens antigas voltam a ser legíveis se não houver outro bloqueio ou regra de privacidade aplicável.",
  },
);
g(
  "relations",
  "/v1/social/mutes",
  "Listar silenciamentos próprios",
  "PageAccount",
);
put(
  "relations",
  "/v1/social/mutes/{accountId}",
  "Silenciar conta",
  null,
  "Empty",
);
del(
  "relations",
  "/v1/social/mutes/{accountId}",
  "Remover silenciamento",
  "Empty",
);
put(
  "relations",
  "/v1/social/posts/{postId}/saved",
  "Salvar publicação legível",
  null,
  "Empty",
);
del(
  "relations",
  "/v1/social/posts/{postId}/saved",
  "Remover publicação dos salvos",
  "Empty",
);
g(
  "relations",
  "/v1/social/saved",
  "Listar recursos salvos legíveis",
  "PageSaved",
  null,
  { query: ["type", "cursor", "limit"] },
);

post(
  "media",
  "/v1/media/uploads",
  "Criar upload limitado e vinculado à conta",
  "UploadCreate",
  "Upload",
);
post(
  "media",
  "/v1/media/{mediaId}/complete",
  "Finalizar upload e validar arquivo",
  null,
  "MediaAsset",
);
g(
  "media",
  "/v1/media/{mediaId}",
  "Consultar processamento do próprio ativo",
  "MediaAsset",
);
del(
  "media",
  "/v1/media/{mediaId}",
  "Descartar upload ou ativo próprio sem vínculos",
  "Empty",
);
g(
  "media",
  "/v1/media/{mediaId}/content",
  "Ler conteúdo depois da verificação de audiência",
  null,
  null,
  { contentResponse: true },
);

g(
  "seek",
  "/v1/seek/cities",
  "Buscar municípios do catálogo IBGE importado",
  "PageCity",
  null,
  { query: ["q", "state", "cursor", "limit"], auth: "optional" },
);
g(
  "seek",
  "/v1/seek/cities/{cityId}",
  "Consultar município real do catálogo",
  "City",
  null,
  { auth: "optional" },
);
g(
  "seek",
  "/v1/seek/categories",
  "Listar categorias e contagens não sensíveis",
  "PageCategory",
  null,
  { query: ["kind", "cityId"], auth: "optional" },
);
g(
  "seek",
  "/v1/seek/discover",
  "Buscar negócios/eventos autorizados",
  "PageDiscovery",
  null,
  {
    query: [
      "q",
      "kind",
      "cityId",
      "category",
      "minRating",
      "open",
      "sort",
      "price",
      "period",
      "cursor",
      "limit",
    ],
    auth: "optional",
  },
);
g(
  "seek",
  "/v1/seek/businesses/{accountId}",
  "Consultar perfil comercial do próprio Social",
  "BusinessProfile",
  null,
  { auth: "optional" },
);
g(
  "seek",
  "/v1/seek/events",
  "Listar eventos publicados de contas comerciais",
  "PageEvent",
  null,
  {
    query: ["q", "cityId", "category", "free", "period", "cursor", "limit"],
    auth: "optional",
  },
);
post(
  "seek",
  "/v1/seek/events",
  "Criar rascunho de evento como conta comercial",
  "EventCreate",
  "Event",
);
g(
  "seek",
  "/v1/seek/events/{eventId}",
  "Ler evento publicado autorizado",
  "Event",
  null,
  { auth: "optional" },
);
patch(
  "seek",
  "/v1/seek/events/{eventId}",
  "Editar evento próprio com versão",
  "EventPatch",
  "Event",
);
post(
  "seek",
  "/v1/seek/events/{eventId}/publish",
  "Publicar evento validado",
  null,
  "Event",
);
post(
  "seek",
  "/v1/seek/events/{eventId}/cancel",
  "Cancelar evento próprio e comunicar interessados",
  null,
  "Event",
);
del("seek", "/v1/seek/events/{eventId}", "Arquivar evento próprio", "Empty");
put(
  "seek",
  "/v1/seek/events/{eventId}/interest",
  "Registrar interesse em evento publicado",
  null,
  "EventInterest",
);
del(
  "seek",
  "/v1/seek/events/{eventId}/interest",
  "Remover interesse próprio",
  "Empty",
);
post(
  "seek",
  "/v1/geo/reverse",
  "Resolver cidade aproximada após ação GPS explícita",
  "GeoReverseRequest",
  "GeoResolution",
);

g(
  "shop",
  "/v1/shop/items",
  "Buscar itens ativos e vendedores comerciais",
  "PageShopItem",
  null,
  {
    query: ["q", "category", "sellerId", "sort", "cursor", "limit"],
    auth: "optional",
  },
);
g("shop", "/v1/shop/items/{itemId}", "Consultar item ativo", "ShopItem", null, {
  auth: "optional",
});
g(
  "shop",
  "/v1/shop/stores",
  "Buscar perfis comerciais que vendem itens reais",
  "PageStore",
  null,
  { query: ["q", "category", "cursor", "limit"], auth: "optional" },
);
g(
  "shop",
  "/v1/shop/categories",
  "Listar categorias com itens ativos",
  "PageCategory",
  null,
  { auth: "optional" },
);
g(
  "shop",
  "/v1/accounts/me/shop/items",
  "Listar itens próprios",
  "PageShopItem",
);
post(
  "shop",
  "/v1/accounts/me/shop/items",
  "Criar item como conta comercial titular",
  "ShopItemWrite",
  "ShopItem",
);
patch(
  "shop",
  "/v1/shop/items/{itemId}",
  "Editar item próprio com versão",
  "ShopItemWrite",
  "ShopItem",
);
del("shop", "/v1/shop/items/{itemId}", "Arquivar item próprio", "Empty");
put(
  "shop",
  "/v1/shop/items/{itemId}/saved",
  "Salvar item ativo",
  null,
  "Empty",
);
del(
  "shop",
  "/v1/shop/items/{itemId}/saved",
  "Remover item dos salvos",
  "Empty",
);

g(
  "messaging",
  "/v1/conversations",
  "Listar conversas próprias paginadas",
  "PageConversation",
  null,
  { query: ["cursor", "limit"] },
);
post(
  "messaging",
  "/v1/conversations",
  "Abrir ou criar conversa direta autorizada",
  "ConversationCreate",
  "Conversation",
);
g(
  "messaging",
  "/v1/conversations/{conversationId}",
  "Ler conversa própria",
  "Conversation",
);
del(
  "messaging",
  "/v1/conversations/{conversationId}",
  "Arquivar conversa para a conta atual",
  "Empty",
);
g(
  "messaging",
  "/v1/conversations/{conversationId}/messages",
  "Listar mensagens autorizadas",
  "PageMessage",
  null,
  { query: ["cursor", "limit"] },
);
post(
  "messaging",
  "/v1/conversations/{conversationId}/messages",
  "Enviar texto como participante",
  "MessageCreate",
  "Message",
);
put(
  "messaging",
  "/v1/conversations/{conversationId}/read",
  "Atualizar cursor próprio de leitura",
  "ReadReceipt",
  "ReadReceipt",
);
g(
  "messaging",
  "/v1/stream",
  "Abrir SSE autenticado, com replay autorizado",
  null,
  null,
  { stream: true },
);

g(
  "notifications",
  "/v1/notifications",
  "Listar notificações próprias",
  "PageNotification",
  null,
  { query: ["unread", "cursor", "limit"] },
);
put(
  "notifications",
  "/v1/notifications/{notificationId}/read",
  "Marcar notificação própria como lida",
  null,
  N,
);
put(
  "notifications",
  "/v1/notifications/read-all",
  "Marcar notificações próprias como lidas",
  null,
  "Empty",
);
getQuery(
  "notifications",
  "/v1/notifications/preferences",
  "Consultar preferências de notificações",
  "NotificationPreferences",
);
put(
  "notifications",
  "/v1/notifications/preferences",
  "Atualizar consentimentos e preferências",
  "NotificationPreferences",
  "NotificationPreferences",
);
post(
  "notifications",
  "/v1/notifications/push-subscriptions",
  "Registrar inscrição Web Push consentida",
  "PushSubscription",
  "Empty",
);
del(
  "notifications",
  "/v1/notifications/push-subscriptions/{subscriptionId}",
  "Revogar inscrição Push própria",
  "Empty",
);

post(
  "privacy",
  "/v1/reports",
  "Enviar denúncia com motivo e alvo",
  "ReportCreate",
  "ReportReceipt",
);
g(
  "privacy",
  "/v1/reports/{reportId}",
  "Consultar somente protocolo de denúncia própria",
  "ReportReceipt",
);
g(
  "moderation",
  "/v1/moderation/reports",
  "Listar fila para equipe autorizada",
  "PageReport",
);
post(
  "moderation",
  "/v1/moderation/reports/{reportId}/actions",
  "Executar decisão auditada de moderação",
  "ModerationAction",
  "Report",
);
g(
  "moderation",
  "/v1/moderation/audit",
  "Consultar trilha para equipe autorizada",
  "PageAudit",
  null,
  { query: ["cursor", "limit"] },
);
post(
  "privacy",
  "/v1/privacy/requests",
  "Solicitar acesso ou exclusão de dados",
  "PrivacyRequest",
  "Accepted",
  { accepted: true },
);
g(
  "privacy",
  "/v1/privacy/requests/{requestId}",
  "Consultar estado de solicitação própria",
  "PrivacyJob",
);
function getQuery(tag, path, summary, response) {
  return g(tag, path, summary, response);
}

const model = (props, required = []) => ({
  type: "object",
  additionalProperties: false,
  properties: props,
  required,
});
const string = { type: "string" },
  uuid = { type: "string", format: "uuid" };
const arr = (schema) => ({ type: "array", items: schema });
const page = (item) =>
  model({ items: arr(ref(item)), nextCursor: { type: ["string", "null"] } }, [
    "items",
  ]);
const audience = { type: "string", enum: ["public", "circles", "private"] };
const rating = { type: "integer", minimum: 1, maximum: 5 };
const schemas = {
  Error: model(
    {
      error: model(
        {
          code: string,
          message: string,
          requestId: string,
          details: arr(
            model({ field: string, message: string }, ["field", "message"]),
          ),
          supportEmail: { type: "string", format: "email" },
          retryAfterSeconds: { type: "integer", minimum: 0 },
          attemptsRemaining: { type: "integer", minimum: 0 },
          resendAvailableAt: { type: "string", format: "date-time" },
        },
        ["code", "message", "requestId"],
      ),
    },
    ["error"],
  ),
  Empty: model({}),
  Accepted: model(
    { jobId: uuid, status: { type: "string", enum: ["queued", "processing"] } },
    ["jobId", "status"],
  ),
  PasswordResetRequested: model(
    { status: { type: "string", enum: ["reset_requested"] }, message: string },
    ["status", "message"],
  ),
  PasswordResetComplete: model(
    { status: { type: "string", enum: ["password_reset"] } },
    ["status"],
  ),
  AccountEmailChangeRequest: model(
    {
      currentPassword: { type: "string", minLength: 8, maxLength: 128 },
      newEmail: { type: "string", format: "email", maxLength: 254 },
    },
    ["currentPassword", "newEmail"],
  ),
  AccountPasswordChangeRequest: model(
    {
      currentPassword: { type: "string", minLength: 8, maxLength: 128 },
      newPassword: {
        type: "string",
        minLength: 8,
        maxLength: 128,
        description:
          "Must include uppercase, lowercase, numeric, and special characters.",
      },
      passwordConfirmation: { type: "string", minLength: 8, maxLength: 128 },
    },
    ["currentPassword", "newPassword", "passwordConfirmation"],
  ),
  ChallengeConfirmInput: model(
    {
      challengeId: uuid,
      code: { type: "string", pattern: "^[0-9]{6}$" },
    },
    ["challengeId", "code"],
  ),
  EmailChangeCurrentCodeResponse: model(
    {
      status: { type: "string", const: "current_email_verification_required" },
      challengeId: uuid,
      currentEmailMasked: string,
      newEmailMasked: string,
      expiresAt: { type: "string", format: "date-time" },
      message: string,
    },
    [
      "status",
      "challengeId",
      "currentEmailMasked",
      "newEmailMasked",
      "expiresAt",
      "message",
    ],
  ),
  EmailChangeNewCodeResponse: model(
    {
      status: { type: "string", const: "new_email_verification_required" },
      challengeId: uuid,
      newEmailMasked: string,
      expiresAt: { type: "string", format: "date-time" },
      message: string,
    },
    ["status", "challengeId", "newEmailMasked", "expiresAt", "message"],
  ),
  PasswordChangeCodeResponse: model(
    {
      status: {
        type: "string",
        const: "password_change_verification_required",
      },
      challengeId: uuid,
      emailMasked: string,
      expiresAt: { type: "string", format: "date-time" },
      message: string,
    },
    ["status", "challengeId", "emailMasked", "expiresAt", "message"],
  ),
  AccountDeletionCodeRequest: model({}),
  AccountDeletionCodeResponse: model(
    {
      status: { type: "string", const: "verification_code_sent" },
      challengeId: uuid,
      emailMasked: string,
      expiresAt: { type: "string", format: "date-time" },
    },
    ["status", "challengeId", "emailMasked", "expiresAt"],
  ),
  AccountDeletionConfirmation: model(
    {
      challengeId: uuid,
      code: { type: "string", pattern: "^[0-9]{6}$" },
    },
    ["challengeId", "code"],
  ),
  AccountRestorationConfirmation: model(
    {
      identifier: { type: "string", minLength: 3, maxLength: 254 },
      password: { type: "string", minLength: 1, maxLength: 128 },
      challengeId: uuid,
      code: { type: "string", pattern: "^[0-9]{6}$" },
    },
    ["identifier", "password", "challengeId", "code"],
  ),
  AccountRestoredResponse: model(
    { status: { type: "string", const: "account_restored" } },
    ["status"],
  ),
  AccountDeletionScheduled: model(
    {
      status: { type: "string", const: "deletion_scheduled" },
      deletionScheduledFor: { type: "string", format: "date-time" },
    },
    ["status", "deletionScheduledFor"],
  ),
  AccountEmailChangeResult: model(
    {
      status: { type: "string", const: "email_changed" },
      email: { type: "string", format: "email" },
      securityNoticeSent: { type: "boolean" },
    },
    ["status", "email", "securityNoticeSent"],
  ),
  AccountPasswordChangeResult: model(
    { status: { type: "string", const: "password_changed" } },
    ["status"],
  ),
  Health: model({ status: { type: "string", const: "ok" } }, ["status"]),
  Readiness: model(
    {
      status: { type: "string", enum: ["ready", "degraded"] },
      checks: { type: "object", additionalProperties: { type: "string" } },
    },
    ["status", "checks"],
  ),
  Csrf: model({ csrfToken: string }, ["csrfToken"]),
  Session: model(
    {
      id: uuid,
      createdAt: { type: "string", format: "date-time" },
      expiresAt: { type: "string", format: "date-time" },
    },
    ["id", "createdAt", "expiresAt"],
  ),
  SessionListItem: model(
    {
      id: uuid,
      createdAt: { type: "string", format: "date-time" },
      expiresAt: { type: "string", format: "date-time" },
      isCurrent: { type: "boolean" },
    },
    ["id", "createdAt", "expiresAt", "isCurrent"],
  ),
  OtherSessionsRevoked: model(
    {
      status: { type: "string", const: "other_sessions_revoked" },
      revokedCount: { type: "integer", minimum: 0 },
    },
    ["status", "revokedCount"],
  ),
  PasswordUpdated: model(
    { status: { type: "string", const: "password_updated" } },
    ["status"],
  ),
  DeviceVerificationRequired: model(
    {
      status: { type: "string", const: "device_verification_required" },
      challengeId: uuid,
      emailMasked: string,
      expiresAt: { type: "string", format: "date-time" },
      resendAvailableAt: { type: "string", format: "date-time" },
      message: string,
    },
    [
      "status",
      "challengeId",
      "emailMasked",
      "expiresAt",
      "resendAvailableAt",
      "message",
    ],
  ),
  PasswordUpdateChallenge: model(
    {
      status: {
        type: "string",
        const: "password_update_verification_required",
      },
      challengeId: uuid,
      emailMasked: string,
      expiresAt: { type: "string", format: "date-time" },
      message: string,
    },
    ["status", "challengeId", "emailMasked", "expiresAt", "message"],
  ),
  DeviceVerificationResent: model(
    {
      status: { type: "string", const: "verification_code_resent" },
      expiresAt: { type: "string", format: "date-time" },
      resendAvailableAt: { type: "string", format: "date-time" },
    },
    ["status", "expiresAt", "resendAvailableAt"],
  ),
  ChallengeConfirmRequest: model(
    {
      challengeId: uuid,
      code: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
    },
    ["challengeId", "code"],
  ),
  ChallengeResendRequest: model({ challengeId: uuid }, ["challengeId"]),
  TrustedDevice: model(
    {
      id: uuid,
      firstSeenAt: { type: "string", format: "date-time" },
      lastSeenAt: { type: "string", format: "date-time" },
      isCurrent: { type: "boolean" },
    },
    ["id", "firstSeenAt", "lastSeenAt", "isCurrent"],
  ),
  TrustedDeviceList: model(
    {
      items: arr(ref("TrustedDevice")),
      hasMore: { type: "boolean" },
    },
    ["items", "hasMore"],
  ),
  OtherDevicesRevoked: model(
    {
      status: { type: "string", const: "other_devices_revoked" },
      revokedCount: { type: "integer", minimum: 0 },
    },
    ["status", "revokedCount"],
  ),
  LegacyPasswordUpdateRequired: model(
    {
      emailVerified: { type: "boolean", const: true },
      passwordUpdateRequired: { type: "boolean", const: true },
      message: string,
    },
    ["emailVerified", "passwordUpdateRequired", "message"],
  ),
  VerificationConfirmation: {
    oneOf: [ref("AuthResult"), ref("LegacyPasswordUpdateRequired")],
  },
  PageSession: page("SessionListItem"),
  AuthenticatedAccount: model(
    {
      id: uuid,
      username: { type: "string", pattern: "^[a-z0-9_]{3,20}$" },
      displayName: { type: "string", maxLength: 100 },
      accountType: { type: "string", enum: ["personal", "commercial"] },
      joinedAt: { type: "string", format: "date-time" },
      onboardingCompleted: { type: "boolean" },
    },
    [
      "id",
      "username",
      "displayName",
      "accountType",
      "joinedAt",
      "onboardingCompleted",
    ],
  ),
  CurrentSession: model(
    {
      authenticated: { type: "boolean" },
      account: { oneOf: [ref("AuthenticatedAccount"), { type: "null" }] },
      session: { oneOf: [ref("Session"), { type: "null" }] },
    },
    ["authenticated", "account", "session"],
  ),
  AuthResult: model(
    {
      account: ref("AuthenticatedAccount"),
      session: ref("Session"),
      csrfToken: string,
      emailVerified: { type: "boolean", const: true },
    },
    ["account", "session", "csrfToken", "emailVerified"],
  ),
  OnboardingCompletionRequest: model(
    {
      interests: {
        type: "array",
        maxItems: 100,
        items: { type: "string", minLength: 1, maxLength: 80 },
        uniqueItems: true,
      },
      skipped: { type: "boolean" },
    },
    ["interests", "skipped"],
  ),
  OnboardingCompletionResult: model(
    {
      onboardingCompleted: { type: "boolean", const: true },
      interestCount: { type: "integer", minimum: 0, maximum: 100 },
    },
    ["onboardingCompleted", "interestCount"],
  ),
  RegistrationPending: model(
    {
      status: { type: "string", const: "verification_required" },
      message: { type: "string", maxLength: 240 },
    },
    ["status", "message"],
  ),
  PersonalRegistration: model(
    {
      accountType: { type: "string", const: "personal" },
      firstName: { type: "string", minLength: 2, maxLength: 80 },
      lastName: { type: "string", minLength: 2, maxLength: 80 },
      age: { type: "integer", minimum: 18, maximum: 120 },
      username: {
        type: "string",
        minLength: 3,
        maxLength: 20,
        pattern: "^[a-z0-9_]+$",
      },
      email: { type: "string", format: "email", maxLength: 254 },
      password: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
        description:
          "Ao menos uma maiúscula, uma minúscula, um número e um caractere especial.",
      },
      passwordConfirmation: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
      },
      acceptedTermsVersion: { type: "string", minLength: 1, maxLength: 50 },
    },
    [
      "accountType",
      "firstName",
      "lastName",
      "age",
      "username",
      "email",
      "password",
      "passwordConfirmation",
      "acceptedTermsVersion",
    ],
  ),
  CommercialRegistration: model(
    {
      accountType: { type: "string", const: "commercial" },
      businessName: { type: "string", minLength: 2, maxLength: 100 },
      age: {
        type: "integer",
        minimum: 18,
        maximum: 120,
        description:
          "Idade informada pelo responsável pela conta comercial; dado privado.",
      },
      username: {
        type: "string",
        minLength: 3,
        maxLength: 20,
        pattern: "^[a-z0-9_]+$",
      },
      email: { type: "string", format: "email", maxLength: 254 },
      password: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
        description:
          "Ao menos uma maiúscula, uma minúscula, um número e um caractere especial.",
      },
      passwordConfirmation: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
      },
      categoryKey: {
        type: "string",
        enum: [
          "restaurantes",
          "bares",
          "cafes",
          "servicos",
          "compras",
          "saude",
          "lazer",
        ],
      },
      discoveryKind: { type: "string", enum: ["place", "provider"] },
      address: { type: "string", minLength: 3, maxLength: 250 },
      postalCode: { type: "string", minLength: 5, maxLength: 20 },
      city: { type: "string", minLength: 2, maxLength: 120 },
      state: { type: "string", minLength: 2, maxLength: 100 },
      country: { type: "string", minLength: 2, maxLength: 100 },
      acceptedTermsVersion: { type: "string", minLength: 1, maxLength: 50 },
    },
    [
      "accountType",
      "businessName",
      "age",
      "username",
      "email",
      "password",
      "passwordConfirmation",
      "categoryKey",
      "discoveryKind",
      "address",
      "postalCode",
      "city",
      "state",
      "country",
      "acceptedTermsVersion",
    ],
  ),
  RegisterRequest: {
    oneOf: [ref("PersonalRegistration"), ref("CommercialRegistration")],
    discriminator: {
      propertyName: "accountType",
      mapping: {
        personal: "#/components/schemas/PersonalRegistration",
        commercial: "#/components/schemas/CommercialRegistration",
      },
    },
  },
  LoginRequest: model(
    {
      identifier: {
        type: "string",
        minLength: 3,
        maxLength: 254,
        description:
          "Nome de usuário ou e-mail; aceita @ inicial no nome de usuário.",
      },
      password: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
        description:
          "Mantém compatibilidade com hashes legados; contas com senha fora da política atual precisam atualizá-la após validar a senha atual.",
      },
    },
    ["identifier", "password"],
  ),
  PasswordPolicyUpdateRequest: model(
    {
      identifier: { type: "string", minLength: 3, maxLength: 254 },
      currentPassword: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
      },
      newPassword: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
        description:
          "Ao menos uma maiúscula, uma minúscula, um número e um caractere especial.",
      },
      passwordConfirmation: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
      },
    },
    ["identifier", "currentPassword", "newPassword", "passwordConfirmation"],
  ),
  PasswordResetRequest: model(
    { email: { type: "string", format: "email", maxLength: 254 } },
    ["email"],
  ),
  PasswordResetConfirm: model(
    {
      email: { type: "string", format: "email", maxLength: 254 },
      code: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
      newPassword: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
        description:
          "Ao menos uma maiúscula, uma minúscula, um número e um caractere especial.",
      },
      passwordConfirmation: {
        type: "string",
        format: "password",
        writeOnly: true,
        minLength: 8,
        maxLength: 128,
      },
    },
    ["email", "code", "newPassword", "passwordConfirmation"],
  ),
  VerificationRequest: model({
    email: { type: "string", format: "email", maxLength: 254 },
  }),
  VerificationConfirm: model(
    {
      email: { type: "string", format: "email", maxLength: 254 },
      code: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
    },
    ["email", "code"],
  ),
  Account: model(
    {
      id: uuid,
      username: { type: "string", pattern: "^[a-z0-9_]{3,20}$" },
      displayName: { type: "string", maxLength: 100 },
      bio: { type: "string", maxLength: 500 },
      avatarUrl: { type: ["string", "null"] },
      coverUrl: { type: ["string", "null"] },
      location: { type: ["string", "null"] },
      website: { type: ["string", "null"], format: "uri" },
      accountType: { type: "string", enum: ["personal", "commercial"] },
      isPrivate: { type: "boolean" },
      joinedAt: { type: "string", format: "date-time" },
      relationship: ref("RelationshipView"),
      stats: ref("AccountStats"),
      version: { type: "integer" },
    },
    [
      "id",
      "username",
      "displayName",
      "accountType",
      "joinedAt",
      "relationship",
      "stats",
      "version",
    ],
  ),
  AccountStats: model(
    {
      posts: { type: "integer", minimum: 0 },
      followers: { type: "integer", minimum: 0 },
      following: { type: "integer", minimum: 0 },
      circles: { type: "integer", minimum: 0 },
    },
    ["posts", "followers", "following", "circles"],
  ),
  RelationshipView: model(
    {
      following: { type: "string", enum: ["none", "pending", "accepted"] },
      inCircle: {
        type: "boolean",
        description:
          "Derivado somente de follows aceitos nos dois sentidos; não é uma relação independente.",
      },
      blockedByMe: {
        type: "boolean",
        description:
          "O visitante iniciou o bloqueio e é o único que pode removê-lo.",
      },
      blockedByThem: {
        type: "boolean",
        description:
          "O perfil alvo iniciou o bloqueio; o visitante não pode removê-lo.",
      },
      mutedByMe: { type: "boolean" },
    },
    ["following", "inCircle", "blockedByMe", "blockedByThem", "mutedByMe"],
  ),
  CommercialProfileDetails: model(
    {
      categoryKey: { type: "string", minLength: 1, maxLength: 40 },
      discoveryKind: { type: "string", enum: ["place", "provider"] },
      address: { type: "string", minLength: 1, maxLength: 250 },
      postalCode: { type: "string", minLength: 1, maxLength: 20 },
      cityName: { type: "string", minLength: 1, maxLength: 120 },
      stateName: { type: "string", minLength: 1, maxLength: 100 },
      countryName: { type: "string", minLength: 1, maxLength: 100 },
    },
    [
      "categoryKey",
      "discoveryKind",
      "address",
      "postalCode",
      "cityName",
      "stateName",
      "countryName",
    ],
  ),
  MyAccountResponse: model(
    {
      account: ref("Account"),
      email: { type: "string", format: "email", maxLength: 254 },
      firstName: { type: ["string", "null"], maxLength: 80 },
      lastName: { type: ["string", "null"], maxLength: 80 },
      commercialProfile: {
        oneOf: [ref("CommercialProfileDetails"), { type: "null" }],
        description:
          "Persisted commercial details, included only when profile visibility allows; null for personal or inaccessible private profiles.",
      },
    },
    ["account", "email", "firstName", "lastName", "commercialProfile"],
  ),
  CommercialAccountPatch: model(
    {
      address: { type: "string", minLength: 5, maxLength: 250 },
      postalCode: { type: "string", minLength: 5, maxLength: 20 },
      cityName: { type: "string", minLength: 2, maxLength: 120 },
      stateName: { type: "string", minLength: 2, maxLength: 100 },
      countryName: { type: "string", minLength: 2, maxLength: 100 },
    },
    ["address", "postalCode", "cityName", "stateName", "countryName"],
  ),
  AccountPatch: model(
    {
      username: { type: "string", pattern: "^[a-z0-9_]{3,20}$" },
      displayName: { type: "string", minLength: 2, maxLength: 100 },
      firstName: { type: "string", minLength: 2, maxLength: 80 },
      lastName: { type: "string", minLength: 2, maxLength: 80 },
      commercialProfile: ref("CommercialAccountPatch"),
      bio: { type: "string", maxLength: 500 },
      location: { type: ["string", "null"], maxLength: 160 },
      website: { type: ["string", "null"], format: "uri" },
      version: { type: "integer", minimum: 1 },
    },
    ["version"],
  ),
  ProfileVisibility: model(
    {
      canViewPublicContent: { type: "boolean" },
      canViewCircleContent: { type: "boolean" },
    },
    ["canViewPublicContent", "canViewCircleContent"],
  ),
  Profile: model(
    {
      account: ref("Account"),
      commercialProfile: {
        oneOf: [ref("CommercialProfileDetails"), { type: "null" }],
        description:
          "Persisted commercial details, included only when profile visibility allows; null for personal or inaccessible private profiles.",
      },
      visibility: ref("ProfileVisibility"),
      posts: page("Post"),
      articles: page("Post"),
      media: page("MediaAsset"),
    },
    [
      "account",
      "commercialProfile",
      "visibility",
      "posts",
      "articles",
      "media",
    ],
  ),
  BusinessProfile: model(
    {
      accountId: uuid,
      discoveryKind: { type: "string", enum: ["place", "provider"] },
      categoryKey: string,
      category: string,
      cityId: { type: "string", pattern: "^[0-9]{7}$" },
      cityName: string,
      cityState: { type: "string", minLength: 2, maxLength: 2 },
      serviceAreas: arr(string),
      openingHours: arr(ref("BusinessHour")),
      serviceOptions: model({
        delivery: { type: ["boolean", "null"] },
        dineIn: { type: ["boolean", "null"] },
        tableService: { type: ["boolean", "null"] },
        reservations: { type: ["boolean", "null"] },
        appointments: { type: ["boolean", "null"] },
        takeout: { type: ["boolean", "null"] },
      }),
      tags: arr(string),
      rating: { type: ["number", "null"], minimum: 1, maximum: 5 },
      reviewCount: { type: "integer", minimum: 0 },
      version: { type: "integer" },
    },
    [
      "accountId",
      "discoveryKind",
      "categoryKey",
      "category",
      "cityId",
      "cityName",
      "cityState",
      "serviceAreas",
      "openingHours",
      "serviceOptions",
      "tags",
      "reviewCount",
      "version",
    ],
  ),
  ServiceOptions: model(
    {
      delivery: { type: ["boolean", "null"] },
      dineIn: { type: ["boolean", "null"] },
      tableService: { type: ["boolean", "null"] },
      reservations: { type: ["boolean", "null"] },
      appointments: { type: ["boolean", "null"] },
      takeout: { type: ["boolean", "null"] },
    },
    [
      "delivery",
      "dineIn",
      "tableService",
      "reservations",
      "appointments",
      "takeout",
    ],
  ),
  BusinessHour: model(
    {
      weekday: { type: "integer", minimum: 0, maximum: 6 },
      opensAt: {
        type: ["string", "null"],
        pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$",
      },
      closesAt: {
        type: ["string", "null"],
        pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$",
      },
      closed: { type: "boolean" },
    },
    ["weekday", "closed"],
  ),
  BusinessWrite: model(
    {
      discoveryKind: { type: "string", enum: ["place", "provider"] },
      categoryKey: string,
      category: string,
      cityId: { type: "string", pattern: "^[0-9]{7}$" },
      serviceAreas: arr(string),
      address: { type: "string", maxLength: 250 },
      openingHours: arr(ref("BusinessHour")),
      serviceOptions: ref("ServiceOptions"),
      tags: arr(string),
      photoMediaIds: arr(uuid),
      videoMediaIds: arr(uuid),
      version: { type: "integer" },
    },
    ["discoveryKind", "categoryKey", "category", "cityId", "version"],
  ),
  Post: model(
    {
      id: uuid,
      authorId: uuid,
      content: { type: "string", maxLength: 280 },
      audience,
      format: { type: "string", enum: ["text", "media", "article"] },
      type: { type: "string", enum: ["text", "video"] },
      article: ref("Article"),
      media: arr(ref("MediaAsset")),
      reference: ref("ContentReference"),
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      version: { type: "integer" },
      stats: ref("PostStats"),
      viewer: ref("PostViewer"),
    },
    [
      "id",
      "authorId",
      "content",
      "audience",
      "format",
      "type",
      "createdAt",
      "version",
      "stats",
      "viewer",
    ],
  ),
  Article: model(
    {
      title: { type: "string", minLength: 1, maxLength: 160 },
      body: { type: "string", minLength: 1, maxLength: 50000 },
    },
    ["title", "body"],
  ),
  PostStats: model(
    {
      likes: { type: "integer", minimum: 0 },
      comments: { type: "integer", minimum: 0 },
      reposts: { type: "integer", minimum: 0 },
      shares: { type: "integer", minimum: 0 },
    },
    ["likes", "comments", "reposts", "shares"],
  ),
  PostViewer: model(
    {
      isLiked: { type: "boolean" },
      isReposted: { type: "boolean" },
      isBookmarked: { type: "boolean" },
    },
    ["isLiked", "isReposted", "isBookmarked"],
  ),
  ContentReference: model(
    {
      type: {
        type: "string",
        enum: ["seek_entity", "shop_item", "social_post"],
      },
      id: { type: "string", minLength: 1, maxLength: 200 },
    },
    ["type", "id"],
  ),
  SocialPostReference: model(
    { type: { type: "string", enum: ["social_post"] }, id: uuid },
    ["type", "id"],
  ),
  PostCreate: model(
    {
      content: { type: "string", maxLength: 280 },
      audience,
      format: { type: "string", enum: ["text", "media"] },
      mediaAssetIds: {
        type: "array",
        maxItems: 8,
        uniqueItems: true,
        items: uuid,
      },
      reference: ref("SocialPostReference"),
      authorId: {
        type: "string",
        deprecated: true,
        description:
          "Compatibilidade transitória; ignorado ou validado contra a sessão.",
      },
    },
    ["audience"],
  ),
  ArticleCreate: model(
    {
      content: { type: "string", maxLength: 280, default: "" },
      audience,
      format: { type: "string", enum: ["article"] },
      article: ref("Article"),
      mediaAssetIds: {
        type: "array",
        maxItems: 8,
        uniqueItems: true,
        items: uuid,
      },
      reference: ref("SocialPostReference"),
      authorId: {
        type: "string",
        deprecated: true,
        description:
          "Compatibilidade transitória; ignorado ou validado contra a sessão.",
      },
    },
    ["audience", "article"],
  ),
  PostPatch: model(
    {
      content: { type: "string", maxLength: 280 },
      audience,
      article: ref("Article"),
      reference: ref("ContentReference"),
      version: { type: "integer" },
    },
    ["version"],
  ),
  PagePost: page("Post"),
  Comment: model(
    {
      id: uuid,
      postId: uuid,
      authorId: uuid,
      content: { type: "string", maxLength: 2000 },
      replyToCommentId: { type: ["string", "null"], format: "uuid" },
      createdAt: { type: "string", format: "date-time" },
      likes: { type: "integer", minimum: 0 },
      isLiked: { type: "boolean" },
      version: { type: "integer" },
    },
    [
      "id",
      "postId",
      "authorId",
      "content",
      "createdAt",
      "likes",
      "isLiked",
      "version",
    ],
  ),
  CommentCreate: model(
    {
      text: { type: "string", minLength: 1, maxLength: 2000 },
      replyToCommentId: { type: ["string", "null"], format: "uuid" },
      authorId: { type: "string", deprecated: true },
    },
    ["text"],
  ),
  CommentPatch: model(
    {
      content: { type: "string", minLength: 1, maxLength: 2000 },
      version: { type: "integer" },
    },
    ["content", "version"],
  ),
  PageComment: page("Comment"),
  Follow: model(
    {
      status: { type: "string", enum: ["pending", "accepted"] },
      updatedAt: { type: "string", format: "date-time" },
    },
    ["status", "updatedAt"],
  ),
  FollowRequest: model(
    {
      account: ref("Account"),
      createdAt: { type: "string", format: "date-time" },
    },
    ["account", "createdAt"],
  ),
  Circle: model(
    { account: ref("Account"), isMutual: { type: "boolean", const: true } },
    ["account", "isMutual"],
  ),
  PageCircle: page("Circle"),
  PageAccount: page("Account"),
  PageFollow: page("FollowRequest"),
  Repost: model(
    {
      id: uuid,
      postId: uuid,
      authorId: uuid,
      createdAt: { type: "string", format: "date-time" },
    },
    ["id", "postId", "authorId", "createdAt"],
  ),
  Trend: model(
    { tag: string, publicPostCount: { type: "integer", minimum: 0 } },
    ["tag", "publicPostCount"],
  ),
  PageTrend: page("Trend"),
  PageTag: page("Tag"),
  Tag: model({ tag: string, count: { type: "integer", minimum: 0 } }, [
    "tag",
    "count",
  ]),
  SearchResults: model(
    {
      posts: page("Post"),
      accounts: page("Account"),
      tags: page("Tag"),
      nextCursor: { type: ["string", "null"] },
    },
    ["posts", "accounts", "tags"],
  ),
  ReferencePreview: model(
    {
      type: {
        type: "string",
        enum: ["seek_entity", "shop_item", "social_post"],
      },
      id: string,
      title: string,
      targetPath: string,
      imageUrl: { type: ["string", "null"] },
      subtitle: { type: ["string", "null"] },
      rating: { type: ["number", "null"] },
      ratingCount: { type: "integer", minimum: 0 },
      authorName: { type: ["string", "null"] },
      authorAvatarUrl: { type: ["string", "null"] },
    },
    ["type", "id", "title", "targetPath"],
  ),
  SocialPostReferencePreview: model(
    {
      type: { type: "string", enum: ["social_post"] },
      id: uuid,
      title: { type: "string", maxLength: 200 },
      imageUrl: string,
      subtitle: string,
      targetPath: string,
      authorName: string,
      authorAvatarUrl: string,
      entityLabel: string,
    },
    ["type", "id", "title", "targetPath"],
  ),
  Activity: model(
    {
      id: uuid,
      type: string,
      resourceType: string,
      resourceId: uuid,
      createdAt: { type: "string", format: "date-time" },
    },
    ["id", "type", "resourceType", "resourceId", "createdAt"],
  ),
  PageActivity: page("Activity"),
  PageMedia: page("MediaAsset"),
  MediaAsset: model(
    {
      id: uuid,
      ownerId: uuid,
      mimeType: string,
      mediaType: { type: "string", enum: ["image", "video"] },
      byteSize: { type: "integer", minimum: 1 },
      status: {
        type: "string",
        enum: ["pending", "processing", "ready", "quarantined", "failed"],
      },
      url: { type: ["string", "null"], format: "uri" },
      width: { type: ["integer", "null"] },
      height: { type: ["integer", "null"] },
      durationMs: { type: ["integer", "null"] },
    },
    ["id", "ownerId", "mimeType", "mediaType", "byteSize", "status"],
  ),
  UploadCreate: model(
    {
      mimeType: {
        type: "string",
        enum: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "video/ogg",
        ],
      },
      byteSize: { type: "integer", minimum: 1 },
      purpose: {
        type: "string",
        enum: ["post", "avatar", "cover", "business", "event", "shop"],
      },
      checksumSha256: { type: "string" },
    },
    ["mimeType", "byteSize", "purpose", "checksumSha256"],
  ),
  Upload: model(
    {
      media: ref("MediaAsset"),
      uploadUrl: { type: "string", format: "uri" },
      method: { type: "string", enum: ["PUT", "POST"] },
      headers: { type: "object", additionalProperties: { type: "string" } },
      expiresAt: { type: "string", format: "date-time" },
    },
    ["media", "uploadUrl", "method", "expiresAt"],
  ),
  PageCity: page("City"),
  PageEvent: page("Event"),
  City: model(
    {
      id: { type: "string", pattern: "^[0-9]{7}$" },
      name: string,
      state: { type: "string", minLength: 2, maxLength: 2 },
      stateName: { type: ["string", "null"] },
    },
    ["id", "name", "state"],
  ),
  PageCategory: page("Category"),
  Category: model(
    {
      key: string,
      name: string,
      kind: {
        type: "string",
        enum: ["place", "provider", "event", "shop_item"],
      },
      resultCount: { type: "integer", minimum: 0 },
    },
    ["key", "name", "kind"],
  ),
  Discovery: model(
    {
      id: uuid,
      kind: { type: "string", enum: ["place", "provider", "event"] },
      name: string,
      category: string,
      description: string,
      href: string,
      city: ref("City"),
      rating: { type: ["number", "null"], minimum: 1, maximum: 5 },
      reviewCount: { type: "integer", minimum: 0 },
      isExample: { type: "boolean", const: false },
      event: ref("Event"),
    },
    ["id", "kind", "name", "category", "href", "reviewCount", "isExample"],
  ),
  PageDiscovery: page("Discovery"),
  BusinessProfileReviewCreate: model(
    { rating, comment: { type: "string", minLength: 10, maxLength: 500 } },
    ["rating", "comment"],
  ),
  BusinessProfileReviewReply: model(
    { content: { type: "string", minLength: 3, maxLength: 500 } },
    ["content"],
  ),
  BusinessProfileReviewBusinessReply: model(
    {
      content: { type: "string", minLength: 3, maxLength: 500 },
      createdAt: { type: "string", format: "date-time" },
    },
    ["content", "createdAt"],
  ),
  BusinessProfileReview: model(
    {
      id: uuid,
      businessAccountId: uuid,
      reviewer: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: uuid,
          username: string,
          displayName: string,
          avatarUrl: { type: ["string", "null"] },
        },
        required: ["id", "username", "displayName", "avatarUrl"],
      },
      rating,
      comment: { type: "string", minLength: 10, maxLength: 500 },
      createdAt: { type: "string", format: "date-time" },
      businessReply: {
        oneOf: [ref("BusinessProfileReviewBusinessReply"), { type: "null" }],
      },
    },
    [
      "id",
      "businessAccountId",
      "reviewer",
      "rating",
      "comment",
      "createdAt",
      "businessReply",
    ],
  ),
  BusinessProfileReviewSummary: model(
    {
      averageRating: { type: ["number", "null"], minimum: 1, maximum: 5 },
      total: { type: "integer", minimum: 0 },
      distribution: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            rating: { type: "integer", minimum: 1, maximum: 5 },
            count: { type: "integer", minimum: 0 },
          },
          required: ["rating", "count"],
        },
        minItems: 5,
        maxItems: 5,
      },
    },
    ["averageRating", "total", "distribution"],
  ),
  BusinessProfileReviewPage: model(
    {
      items: arr(ref("BusinessProfileReview")),
      summary: ref("BusinessProfileReviewSummary"),
      viewerReviewId: { type: ["string", "null"], format: "uuid" },
      nextCursor: { type: ["string", "null"] },
    },
    ["items", "summary", "viewerReviewId", "nextCursor"],
  ),
  BusinessProfileReviewCreated: model(
    {
      id: uuid,
      businessAccountId: uuid,
      reviewerAccountId: uuid,
      createdAt: { type: "string", format: "date-time" },
    },
    ["id", "businessAccountId", "reviewerAccountId", "createdAt"],
  ),
  BusinessProfileReviewDeleted: model(
    { deleted: { type: "boolean", const: true } },
    ["deleted"],
  ),
  BusinessProfileReviewReplyResponse: model(
    {
      id: uuid,
      businessAccountId: uuid,
      businessReply: { type: "string", minLength: 3, maxLength: 500 },
      businessRepliedAt: { type: ["string", "null"], format: "date-time" },
    },
    ["id", "businessAccountId", "businessReply", "businessRepliedAt"],
  ),
  Event: model(
    {
      id: uuid,
      organizerId: uuid,
      name: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", maxLength: 5000 },
      categoryKey: string,
      cityId: { type: "string", pattern: "^[0-9]{7}$" },
      venue: { type: "string", maxLength: 250 },
      startsAt: { type: "string", format: "date-time" },
      timeZone: string,
      endsAt: { type: ["string", "null"], format: "date-time" },
      free: { type: "boolean" },
      priceMinor: { type: ["integer", "null"], minimum: 0 },
      currency: { type: "string", const: "BRL" },
      status: {
        type: "string",
        enum: ["draft", "published", "cancelled", "archived"],
      },
      media: arr(ref("MediaAsset")),
      interestedCount: { type: "integer", minimum: 0 },
      version: { type: "integer" },
    },
    [
      "id",
      "organizerId",
      "name",
      "categoryKey",
      "cityId",
      "venue",
      "startsAt",
      "timeZone",
      "free",
      "currency",
      "status",
      "interestedCount",
      "version",
    ],
  ),
  EventCreate: model(
    {
      name: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", maxLength: 5000 },
      categoryKey: string,
      cityId: { type: "string", pattern: "^[0-9]{7}$" },
      venue: { type: "string", maxLength: 250 },
      startsAt: { type: "string", format: "date-time" },
      timeZone: string,
      endsAt: { type: ["string", "null"], format: "date-time" },
      free: { type: "boolean" },
      priceMinor: { type: ["integer", "null"], minimum: 0 },
      currency: { type: "string", const: "BRL" },
      mediaIds: { type: "array", maxItems: 8, items: uuid },
    },
    [
      "name",
      "categoryKey",
      "cityId",
      "venue",
      "startsAt",
      "timeZone",
      "free",
      "currency",
    ],
  ),
  EventPatch: model(
    {
      name: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", maxLength: 5000 },
      categoryKey: string,
      cityId: { type: "string", pattern: "^[0-9]{7}$" },
      venue: { type: "string", maxLength: 250 },
      startsAt: { type: "string", format: "date-time" },
      timeZone: string,
      endsAt: { type: ["string", "null"], format: "date-time" },
      free: { type: "boolean" },
      priceMinor: { type: ["integer", "null"], minimum: 0 },
      mediaIds: { type: "array", maxItems: 8, items: uuid },
      version: { type: "integer" },
    },
    ["version"],
  ),
  EventInterest: model(
    {
      eventId: uuid,
      interested: { type: "boolean" },
      interestedCount: { type: "integer", minimum: 0 },
    },
    ["eventId", "interested", "interestedCount"],
  ),
  GeoReverseRequest: model(
    {
      latitude: { type: "number", minimum: -90, maximum: 90 },
      longitude: { type: "number", minimum: -180, maximum: 180 },
      consent: { type: "boolean", const: true },
    },
    ["latitude", "longitude", "consent"],
  ),
  GeoResolution: model(
    {
      city: ref("City"),
      precision: { type: "string", const: "approximate" },
      persisted: { type: "boolean", const: false },
    },
    ["city", "precision", "persisted"],
  ),
  ShareIntent: model(
    { id: uuid, createdAt: { type: "string", format: "date-time" } },
    ["id", "createdAt"],
  ),
  ShopItem: model(
    {
      id: uuid,
      sellerId: uuid,
      name: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", maxLength: 5000 },
      kind: { type: "string", enum: ["product", "service"] },
      priceMinor: { type: ["integer", "null"], minimum: 0 },
      compareAtPriceMinor: { type: ["integer", "null"], minimum: 0 },
      currency: { type: "string", const: "BRL" },
      status: { type: "string", enum: ["draft", "active", "archived"] },
      media: arr(ref("MediaAsset")),
      version: { type: "integer" },
    },
    ["id", "sellerId", "name", "kind", "currency", "status", "version"],
  ),
  ShopItemWrite: model(
    {
      name: { type: "string", minLength: 2, maxLength: 160 },
      description: { type: "string", maxLength: 5000 },
      kind: { type: "string", enum: ["product", "service"] },
      priceMinor: { type: ["integer", "null"], minimum: 0 },
      compareAtPriceMinor: { type: ["integer", "null"], minimum: 0 },
      currency: { type: "string", const: "BRL" },
      status: { type: "string", enum: ["draft", "active"] },
      mediaIds: { type: "array", maxItems: 8, items: uuid },
      version: { type: "integer" },
    },
    ["name", "kind", "currency"],
  ),
  PageShopItem: page("ShopItem"),
  Store: model(
    {
      account: ref("Account"),
      itemCount: { type: "integer", minimum: 0 },
      category: string,
    },
    ["account", "itemCount"],
  ),
  PageStore: page("Store"),
  PageSaved: page("SavedResource"),
  SavedResource: model(
    {
      type: {
        type: "string",
        enum: ["post", "business", "event", "shop_item"],
      },
      id: uuid,
      savedAt: { type: "string", format: "date-time" },
      preview: ref("ReferencePreview"),
    },
    ["type", "id", "savedAt", "preview"],
  ),
  Conversation: model(
    {
      id: uuid,
      participants: arr(ref("Account")),
      lastMessage: { oneOf: [ref("Message"), { type: "null" }] },
      unreadCount: { type: "integer", minimum: 0 },
      lastReadMessageId: { type: ["string", "null"], format: "uuid" },
      updatedAt: { type: "string", format: "date-time" },
    },
    ["id", "participants", "unreadCount", "updatedAt"],
  ),
  ConversationCreate: model({ accountId: uuid }, ["accountId"]),
  PageConversation: page("Conversation"),
  Message: model(
    {
      id: uuid,
      conversationId: uuid,
      senderId: uuid,
      content: { type: "string", minLength: 1, maxLength: 5000 },
      createdAt: { type: "string", format: "date-time" },
      version: { type: "integer" },
    },
    ["id", "conversationId", "senderId", "content", "createdAt"],
  ),
  MessageCreate: model(
    {
      content: { type: "string", minLength: 1, maxLength: 5000 },
      clientMessageId: uuid,
    },
    ["content", "clientMessageId"],
  ),
  PageMessage: page("Message"),
  ReadReceipt: model({ lastReadMessageId: uuid }, ["lastReadMessageId"]),
  Notification: model(
    {
      id: uuid,
      type: {
        type: "string",
        enum: ["follow", "like", "comment", "repost", "mention"],
      },
      actor: { oneOf: [ref("Account"), { type: "null" }] },
      resourceType: string,
      resourceId: uuid,
      isRead: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
    },
    ["id", "type", "isRead", "createdAt"],
  ),
  PageNotification: page("Notification"),
  NotificationPreferences: model(
    {
      inApp: { type: "object", additionalProperties: { type: "boolean" } },
      push: { type: "object", additionalProperties: { type: "boolean" } },
      email: { type: "object", additionalProperties: { type: "boolean" } },
      version: { type: "integer" },
    },
    ["inApp", "push", "email", "version"],
  ),
  PushSubscription: model(
    {
      endpoint: { type: "string", format: "uri" },
      p256dh: { type: "string" },
      auth: { type: "string" },
    },
    ["endpoint", "p256dh", "auth"],
  ),
  ReportCreate: model(
    {
      resourceType: {
        type: "string",
        enum: [
          "account",
          "post",
          "comment",
          "business",
          "event",
          "shop_item",
          "message",
        ],
      },
      resourceId: uuid,
      reason: {
        type: "string",
        enum: [
          "spam",
          "harassment",
          "fraud",
          "unsafe",
          "privacy",
          "intellectual_property",
          "other",
        ],
      },
      details: { type: "string", maxLength: 2000 },
    },
    ["resourceType", "resourceId", "reason"],
  ),
  ReportReceipt: model(
    {
      id: uuid,
      status: { type: "string", enum: ["received", "reviewing", "resolved"] },
      createdAt: { type: "string", format: "date-time" },
    },
    ["id", "status", "createdAt"],
  ),
  PageReport: page("Report"),
  Report: model(
    {
      id: uuid,
      status: { type: "string", enum: ["received", "reviewing", "resolved"] },
      reason: string,
      createdAt: { type: "string", format: "date-time" },
      resourceType: string,
      resourceId: uuid,
    },
    ["id", "status", "reason", "createdAt", "resourceType", "resourceId"],
  ),
  ModerationAction: model(
    {
      action: {
        type: "string",
        enum: ["dismiss", "restrict", "remove", "suspend"],
      },
      reason: { type: "string", minLength: 10, maxLength: 2000 },
      version: { type: "integer" },
    },
    ["action", "reason", "version"],
  ),
  PageAudit: page("AuditRecord"),
  AuditRecord: model(
    {
      id: uuid,
      actorId: uuid,
      action: string,
      targetType: string,
      targetId: uuid,
      reason: string,
      createdAt: { type: "string", format: "date-time" },
    },
    [
      "id",
      "actorId",
      "action",
      "targetType",
      "targetId",
      "reason",
      "createdAt",
    ],
  ),
  PrivacyRequest: model(
    {
      kind: { type: "string", enum: ["access", "rectification", "erasure"] },
      details: { type: "string", maxLength: 2000 },
    },
    ["kind"],
  ),
  PrivacyJob: model(
    {
      id: uuid,
      kind: { type: "string", enum: ["access", "erasure"] },
      status: {
        type: "string",
        enum: ["received", "processing", "completed", "rejected"],
      },
      createdAt: { type: "string", format: "date-time" },
    },
    ["id", "kind", "status", "createdAt"],
  ),
  Preferences: model(
    {
      language: string,
      theme: { type: "string", enum: ["dark"] },
      fontScale: { type: "integer", enum: [16, 18, 20] },
      version: { type: "integer" },
    },
    ["language", "theme", "fontScale", "version"],
  ),
  PrivacyWrite: model(
    {
      profileVisibility: { type: "string", enum: ["public", "private"] },
      messages: { type: "string", enum: ["everyone", "circle", "nobody"] },
      readReceipts: { type: "boolean" },
      version: { type: "integer", minimum: 1 },
    },
    ["profileVisibility", "messages", "readReceipts", "version"],
  ),
  Privacy: ref("PrivacyWrite"),
  Interests: model(
    {
      interests: {
        type: "array",
        maxItems: 30,
        items: { type: "string", maxLength: 60 },
      },
      version: { type: "integer" },
    },
    ["interests", "version"],
  ),
  PasswordResetRequest: model(
    { email: { type: "string", format: "email", maxLength: 254 } },
    ["email"],
  ),
  PasswordResetConfirm: model(
    {
      email: { type: "string", format: "email", maxLength: 254 },
      code: { type: "string", pattern: "^[0-9]{6}$" },
      newPassword: {
        type: "string",
        format: "password",
        minLength: 8,
        maxLength: 128,
      },
      passwordConfirmation: {
        type: "string",
        format: "password",
        minLength: 8,
        maxLength: 128,
      },
    },
    ["email", "code", "newPassword", "passwordConfirmation"],
  ),
  VerificationRequest: model(
    { email: { type: "string", format: "email", maxLength: 254 } },
    ["email"],
  ),
  VerificationConfirm: model(
    {
      challengeId: uuid,
      code: { type: "string", minLength: 6, maxLength: 12 },
    },
    ["challengeId", "code"],
  ),
  Availability: model(
    { available: { type: "boolean" }, normalizedUsername: string },
    ["available", "normalizedUsername"],
  ),
  ExportJob: ref("PrivacyJob"),
};

const errorResponses = Object.fromEntries(
  [400, 401, 403, 404, 409, 412, 413, 415, 422, 423, 429, 500, 502, 503].map(
    (code) => [
      code,
      {
        description:
          "Resposta de erro padronizada; detalhes por rota em README e architecture-and-security.",
        content: { "application/json": { schema: ref("Error") } },
      },
    ],
  ),
);
const paths = {};
for (const route of R) {
  const method = route.method;
  const path = route.path;
  paths[path] ??= {};
  const name =
    `${route.tag}_${method}_${path.replaceAll(/[{}]/g, "").replaceAll("/", "_").replaceAll("-", "_")}`.replaceAll(
      /_+/g,
      "_",
    );
  const operationId = `${name}_${Object.keys(paths[path]).length + 1}`;
  const successCode =
    route.successCode ??
    (route.accepted
      ? "202"
      : method === "post" && route.status !== "live"
        ? "201"
        : method === "delete" && route.response === "Empty"
          ? "204"
          : "200");
  const responses = {
    [successCode]: route.contentResponse
      ? {
          description:
            "Bytes de mídia aprovados após a checagem de autorização.",
          content: {
            "image/*": { schema: { type: "string", format: "binary" } },
            "video/*": { schema: { type: "string", format: "binary" } },
          },
        }
      : route.stream
        ? {
            description:
              "SSE autenticado; eventos são apenas notificações de recursos que precisam ser reconsultados.",
            content: { "text/event-stream": { schema: { type: "string" } } },
          }
        : {
            description:
              route.status === "live"
                ? "Endpoint implementado e observado no servidor atual."
                : route.status === "implemented"
                  ? "Handler implementado; depende da migration e da validação HTTP."
                  : "Contrato proposto; handler ainda não existe.",
            ...(route.response
              ? {
                  content: {
                    "application/json": { schema: ref(route.response) },
                  },
                }
              : {}),
          },
    ...(route.additionalSuccessResponses ?? {}),
    ...errorResponses,
  };
  if (route.responseHeaders)
    responses[successCode].headers = route.responseHeaders;
  const parameters = [];
  for (const match of path.matchAll(/\{([^}]+)\}/g))
    parameters.push({
      name: match[1],
      in: "path",
      required: true,
      schema:
        match[1] === "cityId"
          ? { type: "string", pattern: "^[0-9]{7}$" }
          : match[1].endsWith("Id")
            ? uuid
            : string,
    });
  for (const query of route.query ?? [])
    parameters.push({
      name: query,
      in: "query",
      required: (route.requiredQuery ?? []).includes(query),
      schema:
        query === "limit"
          ? { type: "integer", minimum: 1, maximum: 100, default: 20 }
          : string,
    });
  for (const query of route.query ?? [])
    if (query === "q")
      parameters[
        parameters.findIndex((p) => p.name === query && p.in === "query")
      ].schema = { type: "string", maxLength: 160 };
  if (route.request && schemas[route.request]) route.request = route.request;
  paths[path][method] = {
    operationId,
    tags: [route.tag],
    summary: route.summary,
    description:
      route.contractDescription ??
      (route.status === "live"
        ? "LIVE on the audited API server."
        : route.status === "implemented"
      ? "Planning-catalog entry only; do not infer physical migration or mounted-route status from this snapshot."
          : `PROPOSED ONLY; not currently implemented.${route.accepted ? " Async job and request ID; no synchronous-success simulation." : ""}`),
    ...(route.query?.includes("q") && !parameters.some((p) => p.name === "q")
      ? {
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", maxLength: 160 },
            },
          ],
        }
      : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(["get", "head", "options"].includes(method)
      ? {}
      : {
          security: [{ SessionCookie: [], CsrfHeader: [] }],
          ...(route.request
            ? {
                requestBody: {
                  required: method !== "delete",
                  content: {
                    "application/json": {
                      schema: schemas[route.request]
                        ? ref(route.request)
                        : model({}),
                    },
                  },
                },
              }
            : {}),
        }),
    ...(route.auth === "optional"
      ? {
          security: ["get", "head", "options"].includes(method)
            ? [{ SessionCookie: [] }, {}]
            : [{ SessionCookie: [], CsrfHeader: [] }, { CsrfHeader: [] }],
        }
      : route.auth === "required"
        ? {
            security: ["get", "head", "options"].includes(method)
              ? [{ SessionCookie: [] }]
              : [{ SessionCookie: [], CsrfHeader: [] }],
          }
        : route.auth === "none"
          ? { security: [] }
          : {}),
    ...(!route.auth && route.status !== "live" && ["get"].includes(method)
      ? { security: [{ SessionCookie: [] }] }
      : {}),
    ...(route.csrfOnly
      ? {
          security:
            route.auth === "optional"
              ? [
                  { SessionCookie: [], CsrfHeader: [] },
                  { PreAuthCookie: [], CsrfHeader: [] },
                ]
              : route.auth === "required"
                ? [{ SessionCookie: [], CsrfHeader: [] }]
                : [{ PreAuthCookie: [], CsrfHeader: [] }],
        }
      : {}),
    responses: responses,
  };
}

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Seekalive API",
    version: "0.3.1-device-security",
    description:
      "Autenticação, confirmação de e-mail, instalações confiáveis revogáveis, gestão de sessões, onboarding, perfil de conta, privacidade e relações sociais essenciais estão implementados no desenvolvimento. O PostgreSQL gerenciado da Replit contém os schemas ativos de desenvolvimento; produção não foi publicada nem alterada. O envio Resend foi testado em desenvolvimento, mas não está habilitado para produção; os demais contratos seguem como proposta.",
    contact: { name: "Seekalive API" },
  },
  servers: [
    {
      url: "/api",
      description:
        "Prefixo de mesma origem, encaminhado pelo proxy de desenvolvimento do frontend.",
    },
  ],
  tags: [
    { name: "health" },
    { name: "auth" },
    { name: "onboarding" },
    { name: "accounts" },
    { name: "social" },
    { name: "relations" },
    { name: "media" },
    { name: "seek" },
    { name: "shop" },
    { name: "messaging" },
    { name: "notifications" },
    { name: "privacy" },
    { name: "moderation" },
  ],
  paths,
  components: {
    securitySchemes: {
      SessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__Host-seekalive_session",
        description:
          "Cookie de sessão opaca da API própria: Secure, HttpOnly, SameSite=Lax, Path=/; somente o hash do token é persistido.",
      },
      PreAuthCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__Host-seekalive_pre_auth",
        description:
          "Cookie opaco temporário criado pelo endpoint CSRF para proteger cadastro, login e recuperação; Secure, HttpOnly, SameSite=Lax, Path=/, sem permissão de sessão.",
      },
      CsrfHeader: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
        description:
          "Token de curta duração vinculado ao cookie pré-autenticação ou à sessão; obrigatório em toda operação de escrita.",
      },
    },
    schemas,
    parameters: {
      Cursor: { name: "cursor", in: "query", required: false, schema: string },
      IfMatch: {
        name: "If-Match",
        in: "header",
        required: true,
        schema: string,
      },
    },
    responses: { CommonError: errorResponses[422] },
  },
};

// Fail fast if a route names a missing schema, an operationId is duplicated, or a path
// variable has no parameter. Keep generated artifact reproducible and reviewable.
const operationIds = new Set();
for (const [path, operations] of Object.entries(paths)) {
  for (const operation of Object.values(operations)) {
    if (operationIds.has(operation.operationId))
      throw new Error(`operationId duplicado: ${operation.operationId}`);
    operationIds.add(operation.operationId);
    for (const parameter of operation.parameters ?? [])
      if (parameter.in === "path" && !path.includes(`{${parameter.name}}`))
        throw new Error(`Parâmetro path inválido: ${parameter.name}`);
  }
}
await mkdir(roadmapDir, { recursive: true });
await writeFile(
  join(roadmapDir, "seekalive-operation-catalog.json"),
  `${JSON.stringify(spec, null, 2)}\n`,
);
const lines = [
  "# Catálogo de operações de referência",
  "",
  `Gerado por \`node docs/api/backend/generate-contracts.mjs\`. Este registro histórico de planejamento contém **${R.length} operações** e não é o inventário de rotas ativas nem o contrato da API. IDs UUID são exemplos de formato, nunca IDs de catálogo mock.`,
  "",
  "> **Não normativo:** os estados e descrições deste catálogo são o snapshot original do planejamento. Para rotas realmente montadas, use `docs/api/backend/endpoints.md`; para o contrato HTTP, use `shared/api-spec/openapi.yaml`. Este arquivo não prova testes, persistência ou implantação.",
  "> **Regras vigentes que substituem qualquer conflito neste snapshot:** audiência `private` = titular e seguidores aprovados de perfil privado; Círculo exige seguimento mútuo; campos de apresentação e avaliações pertencem a Profiles; Seek apenas consome projeções públicas autorizadas e não cria nem edita avaliações.",
  "",
  "## Respostas, paginação e autenticação",
  "",
  "- GET normalmente responde `200`; login em instalação conhecida responde `200`, mas instalação desconhecida recebe desafio `202` sem sessão; troca de senha inicia com `202`; remoções sem corpo podem responder `204`.",
  "- Página: `items` e `nextCursor` opaco ou null. Limite 20, máximo 100. Formato não substitui o contrato existente `Page<T>`.",
  "- Erro: `{error:{code,message,requestId,details?,supportEmail?,retryAfterSeconds?,attemptsRemaining?,resendAvailableAt?}}`. Nunca serializar stack trace.",
  "- Escritas autenticadas: cookie + `X-CSRF-Token`; POST com efeito recebe `Idempotency-Key` quando indicado na especificação de arquitetura.",
  "- Não use os estados registrados abaixo para decidir se uma rota está ativa. Essa informação é regenerada a partir do Express e do OpenAPI.",
  "",
];
for (const tag of [...new Set(R.map((r) => r.tag))]) {
  lines.push(
    `## ${tag[0].toUpperCase()}${tag.slice(1)}`,
    "",
    "| Método | Endpoint | Acesso | Corpo | Resposta | Estado / notas |",
    "|---|---|---|---|---|---|",
  );
  for (const r of R.filter((x) => x.tag === tag)) {
    const access =
      r.auth === "none"
        ? "Público"
        : r.auth === "optional"
          ? "Público/sessão; ACL no servidor"
          : r.auth === "preAuth"
            ? "Cookie de pré-autenticação"
            : "Sessão autenticada";
    const state =
      r.status === "live"
        ? "ATIVA"
        : r.status === "implemented"
        ? "IMPLEMENTADA EM CÓDIGO; ESTADO FÍSICO DO BANCO NÃO ASSERTADO"
          : "PROPOSTA";
    const responseLabel =
      r.responseVariants ?? (r.response ? `\`${r.response}\`` : "bytes/SSE");
    lines.push(
      `| ${r.method.toUpperCase()} | \`${r.path}\` | ${access} | ${r.request ? `\`${r.request}\`` : "—"} | ${responseLabel} | **${state}**${r.accepted ? "; assíncrona" : ""}${r.stream ? "; Server-Sent Events" : ""} |`,
    );
  }
  lines.push("");
}
lines.push(
  "## Rotas intencionalmente não prometidas",
  "",
  "Checkout, pagamento, assinatura, pedido, entrega, reserva de mesa, agendamento confirmado, ingresso e localização por raio não aparecem como recursos prontos nesta especificação. Se aprovados, serão uma fase e contratos separados. O Shop atual desabilita compra e os eventos atuais não recebem inscrições pagas.",
  "",
);
await writeFile(
  join(roadmapDir, "seekalive-operation-catalog.md"),
  `${lines.join("\n")}\n`,
);
console.log(
  JSON.stringify({
    endpoints: R.length,
    paths: Object.keys(paths).length,
    schemas: Object.keys(schemas).length,
    live: R.filter((r) => r.status === "live").length,
    outputDirectory: "docs/roadmap",
  }),
);
