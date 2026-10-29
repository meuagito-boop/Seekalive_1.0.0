import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmAccountDeletion,
  requestAccountDeletionCode,
} from "@/modules/auth/services/accountDeletionApi";

type Props = {
  onScheduled: (deletionScheduledFor: string) => void;
};

export function AccountDeletionControls({ onScheduled }: Props) {
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    emailMasked: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    setIsSending(true);
    try {
      const result = await requestAccountDeletionCode();
      setChallenge({
        challengeId: result.challengeId,
        emailMasked: result.emailMasked,
      });
      setCode("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível enviar o código.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code)) {
      setError("Informe o código de seis dígitos recebido por e-mail.");
      return;
    }

    setError(null);
    setIsConfirming(true);
    try {
      const result = await confirmAccountDeletion({
        challengeId: challenge.challengeId,
        code,
      });
      onScheduled(result.deletionScheduledFor);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível confirmar a solicitação.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <section
      aria-labelledby="account-deletion-title"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <div>
        <h3 id="account-deletion-title" className="text-sm font-semibold">
          Exclusão permanente da conta
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A conta ficará oculta e desativada assim que você confirmar o código.
          A exclusão definitiva será agendada para sete dias depois. Até lá,
          você poderá restaurá-la pela tela de login com sua senha e um código
          enviado ao e-mail.
        </p>
      </div>

      {!challenge ? (
        <Button
          type="button"
          variant="destructive"
          className="min-h-11 w-full rounded-xl"
          disabled={isSending}
          onClick={() => void sendCode()}
          data-testid="button-request-account-deletion"
        >
          {isSending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSending ? "Enviando código…" : "Solicitar exclusão permanente"}
        </Button>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => void submitCode(event)}
        >
          <p className="text-sm" role="status">
            Enviamos o código para <strong>{challenge.emailMasked}</strong>. Ele
            expira em 10 minutos. Não enviaremos outro e-mail após a
            confirmação.
          </p>
          <div className="space-y-2">
            <label
              htmlFor="account-deletion-code"
              className="text-sm font-medium"
            >
              Código de confirmação
            </label>
            <Input
              id="account-deletion-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              aria-describedby={error ? "account-deletion-error" : undefined}
              className="min-h-11 text-center text-lg tracking-[0.35em]"
              required
            />
          </div>
          {error ? (
            <p
              id="account-deletion-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="destructive"
              className="min-h-11 flex-1 rounded-xl"
              disabled={isConfirming || code.length !== 6}
              data-testid="button-confirm-account-deletion"
            >
              {isConfirming ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {isConfirming ? "Confirmando…" : "Confirmar exclusão"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl"
              disabled={isSending || isConfirming}
              onClick={() => void sendCode()}
            >
              Reenviar código
            </Button>
          </div>
        </form>
      )}

      {error && !challenge ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
