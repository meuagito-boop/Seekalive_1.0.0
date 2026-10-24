export class EmailDeliveryUnavailableError extends Error {
  constructor() {
    super("Email verification delivery is not configured.");
    this.name = "EmailDeliveryUnavailableError";
  }
}

export type VerificationEmail = {
  email: string;
  displayName: string;
  code: string;
};

export interface AuthEmailDelivery {
  readonly isConfigured: boolean;
  sendVerificationCode(message: VerificationEmail): Promise<void>;
}

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const isDevelopment = process.env.NODE_ENV === "development";
const resendEnabled = process.env.RESEND_ENABLED === "true";
const resendFrom = process.env.RESEND_FROM_EMAIL?.trim()
  || (isDevelopment ? "Seekalive Test <onboarding@resend.dev>" : "");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Resend is intentionally enabled only in development. Production remains
// disabled until its sender domain and deployment policy are explicitly set up.
export const authEmailDelivery: AuthEmailDelivery = {
  isConfigured: isDevelopment && resendEnabled && Boolean(resendApiKey && resendFrom),
  async sendVerificationCode(message) {
    if (!isDevelopment || !resendEnabled || !resendApiKey || !resendFrom) {
      throw new EmailDeliveryUnavailableError();
    }

    const displayName = escapeHtml(message.displayName);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [message.email],
        subject: "Confirme seu e-mail — Seekalive",
        text: `Olá, ${message.displayName}.\n\nSeu código de verificação do Seekalive é: ${message.code}\n\nEle expira em 10 minutos. Se você não iniciou este cadastro, ignore esta mensagem.`,
        html: `<p>Olá, ${displayName}.</p><p>Seu código de verificação do Seekalive é:</p><p style="font-size:24px;font-weight:700;letter-spacing:6px">${message.code}</p><p>Ele expira em 10 minutos. Se você não iniciou este cadastro, ignore esta mensagem.</p>`,
      }),
    });

    if (!response.ok) {
      // Do not include provider response bodies or credentials in thrown/logged
      // errors; auth routes return a generic delivery failure to the client.
      throw new Error(`Resend email request failed with status ${response.status}.`);
    }
  },
};
