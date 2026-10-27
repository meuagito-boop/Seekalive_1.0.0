import { SUPPORT_EMAIL } from "@workspace/api-zod";
import type {
  AccountEmailChangeSecurityNotice,
  AuthEmailDelivery,
  DeviceLoginEmail,
  PasswordResetEmail,
  PasswordUpdateEmail,
  VerificationEmail,
} from "../application/emailDelivery";

export class EmailDeliveryUnavailableError extends Error {
  constructor() {
    super("Auth email delivery is not configured.");
    this.name = "EmailDeliveryUnavailableError";
  }
}

let testAuthEmailDelivery: AuthEmailDelivery | undefined;

export function setAuthEmailDeliveryForTests(
  delivery: AuthEmailDelivery,
): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Test email delivery can only be configured in NODE_ENV=test.",
    );
  }
  testAuthEmailDelivery = delivery;
}

export function getAuthEmailDelivery(): AuthEmailDelivery {
  return testAuthEmailDelivery ?? authEmailDelivery;
}

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const isDevelopment = process.env.NODE_ENV === "development";
const resendEnabled = process.env.RESEND_ENABLED === "true";
const resendFrom =
  process.env.RESEND_FROM_EMAIL?.trim() ||
  (isDevelopment ? "Seekalive Test <onboarding@resend.dev>" : "");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendResendEmail(message: {
  email: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!isDevelopment || !resendEnabled || !resendApiKey || !resendFrom) {
    throw new EmailDeliveryUnavailableError();
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [message.email],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Do not include provider response bodies or credentials in thrown/logged
    // errors; auth routes return a generic delivery failure to the client.
    throw new Error(
      `Resend email request failed with status ${response.status}.`,
    );
  }
}

// Resend is intentionally enabled only in development. Production remains
// disabled until its sender domain and deployment policy are explicitly set up.
export const authEmailDelivery: AuthEmailDelivery = {
  isConfigured:
    isDevelopment && resendEnabled && Boolean(resendApiKey && resendFrom),
  async sendVerificationCode(message) {
    const displayName = escapeHtml(message.displayName);
    await sendResendEmail({
      email: message.email,
      subject: "Confirme seu e-mail — Seekalive",
      text: `Olá, ${message.displayName}.\n\nSeu código de verificação do Seekalive é: ${message.code}\n\nEle expira em 10 minutos. Se você não iniciou este cadastro, ignore esta mensagem.`,
      html: `<p>Olá, ${displayName}.</p><p>Seu código de verificação do Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. Se você não iniciou este cadastro, ignore esta mensagem.</p>`,
    });
  },
  async sendPasswordResetCode(message) {
    await sendResendEmail({
      email: message.email,
      subject: "Redefina sua senha — Seekalive",
      text: `Seu código para redefinir a senha do Seekalive é: ${message.code}\n\nEle expira em 10 minutos e pode ser usado uma única vez. Se você não solicitou a redefinição, ignore esta mensagem.`,
      html: `<p>Seu código para redefinir a senha do Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos e pode ser usado uma única vez. Se você não solicitou a redefinição, ignore esta mensagem.</p>`,
    });
  },
  async sendDeviceLoginCode(message) {
    const displayName = escapeHtml(message.displayName);
    await sendResendEmail({
      email: message.email,
      subject: "Confirme este acesso — Seekalive",
      text: `Olá, ${message.displayName}.\n\nFoi solicitada uma entrada no Seekalive por uma instalação ainda não reconhecida. Seu código é: ${message.code}\n\nEle expira em 10 minutos. Se não foi você, ignore esta mensagem e altere sua senha.`,
      html: `<p>Olá, ${displayName}.</p><p>Foi solicitada uma entrada no Seekalive por uma instalação ainda não reconhecida. Seu código é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. Se não foi você, ignore esta mensagem e altere sua senha.</p>`,
    });
  },
  async sendPasswordUpdateCode(message) {
    const displayName = escapeHtml(message.displayName);
    await sendResendEmail({
      email: message.email,
      subject: "Confirme a alteração da senha — Seekalive",
      text: `Olá, ${message.displayName}.\n\nSeu código para confirmar a alteração da senha do Seekalive é: ${message.code}\n\nEle expira em 10 minutos. Após a confirmação, todas as sessões e instalações confiáveis serão revogadas.`,
      html: `<p>Olá, ${displayName}.</p><p>Seu código para confirmar a alteração da senha do Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. Após a confirmação, todas as sessões e instalações confiáveis serão revogadas.</p>`,
    });
  },
  async sendAccountPasswordChangeCode(message) {
    const displayName = escapeHtml(message.displayName);
    await sendResendEmail({
      email: message.email,
      subject: "Confirme a troca de senha — Seekalive",
      text: `Olá, ${message.displayName}.\n\nSeu código para confirmar a troca da senha do Seekalive é: ${message.code}\n\nEle expira em 10 minutos. Após a troca, todas as sessões e instalações reconhecidas serão revogadas. Se você não solicitou esta alteração, ignore esta mensagem e procure o suporte.`,
      html: `<p>Olá, ${displayName}.</p><p>Seu código para confirmar a troca da senha do Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. Após a troca, todas as sessões e instalações reconhecidas serão revogadas. Se você não solicitou esta alteração, ignore esta mensagem e procure o suporte.</p>`,
    });
  },
  async sendAccountEmailChangeCurrentCode(message) {
    const displayName = escapeHtml(message.displayName);
    await sendResendEmail({
      email: message.email,
      subject: "Autorize a troca de e-mail — Seekalive",
      text: `Olá, ${message.displayName}.\n\nSeu código para autorizar a troca do e-mail da conta Seekalive é: ${message.code}\n\nEle expira em 10 minutos. O endereço atual continuará ativo até a confirmação do novo endereço. Se você não solicitou esta alteração, ignore esta mensagem.`,
      html: `<p>Olá, ${displayName}.</p><p>Seu código para autorizar a troca do e-mail da conta Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. O endereço atual continuará ativo até a confirmação do novo endereço. Se você não solicitou esta alteração, ignore esta mensagem.</p>`,
    });
  },
  async sendAccountEmailChangeNewCode(message) {
    const displayName = escapeHtml(message.displayName);
    await sendResendEmail({
      email: message.email,
      subject: "Confirme o novo e-mail — Seekalive",
      text: `Olá, ${message.displayName}.\n\nSeu código para confirmar este endereço como novo e-mail da conta Seekalive é: ${message.code}\n\nEle expira em 10 minutos. O e-mail atual não será alterado até este código ser confirmado. Se você não solicitou esta alteração, ignore esta mensagem.`,
      html: `<p>Olá, ${displayName}.</p><p>Seu código para confirmar este endereço como novo e-mail da conta Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. O e-mail atual não será alterado até este código ser confirmado. Se você não solicitou esta alteração, ignore esta mensagem.</p>`,
    });
  },
  async sendAccountEmailChangeSecurityNotice(message) {
    const displayName = escapeHtml(message.displayName);
    const newEmailMasked = escapeHtml(message.newEmailMasked);
    await sendResendEmail({
      email: message.email,
      subject: "O e-mail da sua conta Seekalive foi alterado",
      text: `Olá, ${message.displayName}.\n\nO e-mail da sua conta Seekalive foi alterado. O novo endereço confirmado, mascarado, é: ${message.newEmailMasked}.\n\nSe você não fez essa alteração, entre em contato com o suporte: ${SUPPORT_EMAIL}.`,
      html: `<p>Olá, ${displayName}.</p><p>O e-mail da sua conta Seekalive foi alterado. O novo endereço confirmado, mascarado, é: ${newEmailMasked}.</p><p>Se você não fez essa alteração, entre em contato com o suporte: ${SUPPORT_EMAIL}.</p>`,
    });
  },
};
