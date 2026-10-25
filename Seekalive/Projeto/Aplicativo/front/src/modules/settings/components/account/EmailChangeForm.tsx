import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/modules/shared/hooks/useToast";
import {
  confirmCurrentAccountEmailChange,
  confirmNewAccountEmailChange,
  requestAccountEmailChange,
} from "@/modules/auth/services/accountSecurityApi";

type EmailChangeStep = "idle" | "confirm-current" | "confirm-new";

interface EmailChangeFormProps {
  email: string;
  disabledField: string;
  onEmailChanged: (email: string) => void;
}

function expirationTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function EmailChangeForm({ email, disabledField, onEmailChanged }: EmailChangeFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<EmailChangeStep>("idle");
  const [challengeId, setChallengeId] = useState("");
  const [currentEmailMasked, setCurrentEmailMasked] = useState("");
  const [newEmailMasked, setNewEmailMasked] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setStep("idle");
    setChallengeId("");
    setCurrentEmailMasked("");
    setNewEmailMasked("");
    setExpiresAt("");
    setCurrentPassword("");
    setNewEmail("");
    setCode("");
    setError(null);
  }

  async function requestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await requestAccountEmailChange({ currentPassword, newEmail });
      setChallengeId(result.challengeId);
      setCurrentEmailMasked(result.currentEmailMasked ?? "");
      setNewEmailMasked(result.newEmailMasked ?? "");
      setExpiresAt(result.expiresAt);
      setCurrentPassword("");
      setNewEmail("");
      setCode("");
      setStep("confirm-current");
      toast({ title: "Código enviado", description: result.message });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível iniciar a troca de e-mail.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (step === "confirm-current") {
        const result = await confirmCurrentAccountEmailChange({ challengeId, code });
        setChallengeId(result.challengeId);
        setNewEmailMasked(result.newEmailMasked ?? newEmailMasked);
        setExpiresAt(result.expiresAt);
        setCode("");
        setStep("confirm-new");
        toast({ title: "E-mail atual confirmado", description: result.message });
        return;
      }

      const result = await confirmNewAccountEmailChange({ challengeId, code });
      onEmailChanged(result.email);
      reset();
      toast({
        title: "E-mail alterado",
        description: result.securityNoticeSent
          ? "O novo endereço foi confirmado. Enviamos um aviso ao e-mail anterior."
          : "O novo endereço foi confirmado, mas não foi possível enviar o aviso ao e-mail anterior.",
        ...(result.securityNoticeSent ? {} : { variant: "destructive" as const }),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível confirmar o código.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="email-change-title">
      <div>
        <h3 id="email-change-title" className="text-base font-semibold">Trocar e-mail</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          O endereço atual continua ativo até você confirmar o código enviado ao novo e-mail.
        </p>
      </div>

      {step === "idle" ? (
        <form onSubmit={(event) => void requestChange(event)} className="space-y-3">
          <Input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            aria-label="Novo endereço de e-mail"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "email-change-error" : undefined}
            autoComplete="email"
            maxLength={254}
            required
            placeholder="Novo e-mail"
            className={disabledField}
            disabled={isSubmitting}
          />
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            aria-label="Senha atual para autorizar a troca de e-mail"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "email-change-error" : undefined}
            autoComplete="current-password"
            maxLength={128}
            required
            placeholder="Senha atual"
            className={disabledField}
            disabled={isSubmitting}
          />
          <Button type="submit" className="min-h-11 rounded-xl" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Enviar código ao e-mail atual
          </Button>
        </form>
      ) : (
        <form onSubmit={(event) => void confirmCode(event)} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {step === "confirm-current"
              ? `Digite o código enviado ao e-mail atual ${currentEmailMasked}.`
              : `Digite o código enviado ao novo endereço ${newEmailMasked}.`}
            {" "}O código expira às {expirationTime(expiresAt)}.
          </p>
          <Input
            value={code}
            onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
            aria-label="Código de confirmação do e-mail"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "email-change-error" : undefined}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            minLength={6}
            required
            placeholder="Código de 6 dígitos"
            className={disabledField}
            disabled={isSubmitting}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11 rounded-xl" disabled={isSubmitting || code.length !== 6}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {step === "confirm-current" ? "Confirmar e enviar ao novo e-mail" : "Confirmar novo e-mail"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={isSubmitting} onClick={reset}>
              Iniciar novamente
            </Button>
          </div>
        </form>
      )}
      {error && <p id="email-change-error" role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="sr-only">E-mail atual da conta: {email}</p>
    </section>
  );
}
