import type { FormEventHandler } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PasswordUpdateVerificationRequired } from "@/modules/auth/types";

interface PasswordUpdateVerificationPanelProps {
  challenge: PasswordUpdateVerificationRequired;
  code: string;
  onCodeChange: (value: string) => void;
  onConfirm: FormEventHandler<HTMLFormElement>;
  onBack: () => void;
}

export function PasswordUpdateVerificationPanel({
  challenge,
  code,
  onCodeChange,
  onConfirm,
  onBack,
}: PasswordUpdateVerificationPanelProps) {
  return (
    <section aria-labelledby="password-update-verification-heading" className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 id="password-update-verification-heading" className="text-lg font-semibold text-foreground">
        Confirme a alteração da senha
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Enviamos um código para <strong className="font-medium text-foreground">{challenge.emailMasked}</strong>.
        Após confirmar, todas as sessões e instalações confiáveis serão revogadas.
      </p>
      <form onSubmit={onConfirm} className="mt-4 space-y-4">
        <label htmlFor="password-update-code" className="block text-sm font-medium text-foreground">
          Código de confirmação
        </label>
        <Input
          id="password-update-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 rounded-xl border-border bg-card tracking-[0.35em] text-foreground"
          required
        />
        <Button type="submit" className="min-h-11 w-full rounded-xl" disabled={code.length !== 6}>
          Confirmar alteração
        </Button>
        <button
          type="button"
          className="w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onBack}
        >
          Voltar
        </button>
      </form>
    </section>
  );
}
