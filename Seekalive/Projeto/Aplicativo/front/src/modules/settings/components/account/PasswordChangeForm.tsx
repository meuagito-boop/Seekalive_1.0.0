import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { accountPasswordChangeRequestSchema } from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/modules/shared/hooks/useToast";
import {
  confirmAccountPasswordChange,
  requestAccountPasswordChange,
} from "@/modules/auth/services/accountSecurityApi";

interface PasswordChangeFormProps {
  email: string;
  disabledField: string;
  onPasswordChanged: () => void;
}

function expirationTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PasswordChangeForm({ email, disabledField, onPasswordChanged }: PasswordChangeFormProps) {
  const { toast } = useToast();
  const [challengeId, setChallengeId] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setChallengeId("");
    setEmailMasked("");
    setExpiresAt("");
    setCurrentPassword("");
    setNewPassword("");
    setPasswordConfirmation("");
    setCode("");
    setError(null);
  }

  async function requestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = accountPasswordChangeRequestSchema.safeParse({
      currentPassword,
      newPassword,
      passwordConfirmation,
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Confira os dados da nova senha.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await requestAccountPasswordChange({
        currentPassword,
        newPassword,
        passwordConfirmation,
      });
      setChallengeId(result.challengeId);
      setEmailMasked(result.emailMasked ?? "");
      setExpiresAt(result.expiresAt);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      setCode("");
      toast({ title: "Código enviado", description: result.message });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível iniciar a troca de senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmAccountPasswordChange({ challengeId, code });
      reset();
      toast({
        title: "Senha alterada",
        description: "Por segurança, todas as sessões foram encerradas. Entre novamente com a nova senha.",
      });
      onPasswordChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível confirmar a troca de senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-labelledby="password-change-title">
      <div>
        <h3 id="password-change-title" className="text-base font-semibold">Trocar senha</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Você precisará da senha atual e de um código enviado a {email}.
          Após a confirmação, todas as sessões e instalações reconhecidas serão revogadas.
        </p>
      </div>
      {!challengeId ? (
        <form onSubmit={(event) => void requestChange(event)} className="space-y-3">
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            aria-label="Senha atual"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "password-change-error" : undefined}
            autoComplete="current-password"
            maxLength={128}
            required
            placeholder="Senha atual"
            className={disabledField}
            disabled={isSubmitting}
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-label="Nova senha"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "password-change-error" : undefined}
            autoComplete="new-password"
            maxLength={128}
            required
            placeholder="Nova senha"
            className={disabledField}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.
          </p>
          <Input
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            aria-label="Confirme a nova senha"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "password-change-error" : undefined}
            autoComplete="new-password"
            maxLength={128}
            required
            placeholder="Confirme a nova senha"
            className={disabledField}
            disabled={isSubmitting}
          />
          <Button type="submit" className="min-h-11 rounded-xl" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Enviar código ao e-mail atual
          </Button>
        </form>
      ) : (
        <form onSubmit={(event) => void confirmChange(event)} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Digite o código enviado a {emailMasked}. Ele expira às {expirationTime(expiresAt)}.
          </p>
          <Input
            value={code}
            onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
            aria-label="Código para confirmar a troca de senha"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "password-change-error" : undefined}
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
              Confirmar troca e encerrar sessões
            </Button>
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" disabled={isSubmitting} onClick={reset}>
              Iniciar novamente
            </Button>
          </div>
        </form>
      )}
      {error && <p id="password-change-error" role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
