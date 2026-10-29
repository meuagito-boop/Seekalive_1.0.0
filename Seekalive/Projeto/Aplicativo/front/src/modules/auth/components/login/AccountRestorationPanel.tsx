import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountDeletionPending } from "@/modules/auth/types";
import {
  confirmAccountRestoration,
  requestAccountRestorationCode,
} from "@/modules/auth/services/accountRestorationApi";
import type { LoginFormValues } from "../../application/loginFormSchema";

type Props = {
  pending: AccountDeletionPending;
  credentials: LoginFormValues;
  onRestored: () => void;
  onCancel: () => void;
};

export function AccountRestorationPanel({
  pending,
  credentials,
  onRestored,
  onCancel,
}: Props) {
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    emailMasked: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setIsSending(true);
    setError(null);
    try {
      const result = await requestAccountRestorationCode(credentials);
      setChallenge({
        challengeId: result.challengeId,
        emailMasked: result.emailMasked,
      });
      setCode("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível enviar o código de restauração.",
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

    setIsConfirming(true);
    setError(null);
    try {
      await confirmAccountRestoration({
        ...credentials,
        challengeId: challenge.challengeId,
        code,
      });
      onRestored();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível restaurar a conta.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  const deadline = new Date(pending.deletionScheduledFor).toLocaleString(
    "pt-BR",
  );

  return (
    <section
      aria-labelledby="account-restoration-title"
      className="space-y-4 rounded-2xl border border-amber-500/35 bg-amber-500/5 p-4 sm:p-5"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Exclusão agendada
        </p>
        <h2
          id="account-restoration-title"
          className="mt-1 text-xl font-semibold"
        >
          Restaurar sua conta?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {pending.message} A exclusão definitiva está prevista para{" "}
          <strong>{deadline}</strong>. A confirmação exige sua senha e um código
          enviado para {pending.emailMasked}. Depois da restauração, você
          entrará novamente pela tela de login.
        </p>
      </div>

      {!challenge ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-11 flex-1 rounded-xl"
            disabled={isSending}
            onClick={() => void sendCode()}
            data-testid="button-start-account-restoration"
          >
            {isSending ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {isSending ? "Enviando código…" : "Restaurar conta"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-xl"
            disabled={isSending}
            onClick={onCancel}
          >
            Não restaurar agora
          </Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => void submitCode(event)}
        >
          <p className="text-sm" role="status">
            Código enviado para <strong>{challenge.emailMasked}</strong>. Expira
            em 10 minutos.
          </p>
          <div className="space-y-2">
            <label
              htmlFor="account-restoration-code"
              className="text-sm font-medium"
            >
              Código de restauração
            </label>
            <Input
              id="account-restoration-code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              aria-describedby={error ? "account-restoration-error" : undefined}
              className="min-h-11 text-center text-lg tracking-[0.35em]"
              required
            />
          </div>
          {error ? (
            <p
              id="account-restoration-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              className="min-h-11 flex-1 rounded-xl"
              disabled={isConfirming || code.length !== 6}
            >
              {isConfirming ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {isConfirming ? "Restaurando…" : "Confirmar restauração"}
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
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full"
            disabled={isSending || isConfirming}
            onClick={onCancel}
          >
            Voltar ao login
          </Button>
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
