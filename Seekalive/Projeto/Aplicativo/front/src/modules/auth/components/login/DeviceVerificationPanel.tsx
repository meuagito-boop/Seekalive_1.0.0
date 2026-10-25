import type { FormEventHandler } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DeviceVerificationRequired } from "@/modules/auth/types";

interface DeviceVerificationPanelProps {
  challenge: DeviceVerificationRequired;
  code: string;
  resendSeconds: number;
  onCodeChange: (value: string) => void;
  onConfirm: FormEventHandler<HTMLFormElement>;
  onResend: () => void;
  onBack: () => void;
}

export function DeviceVerificationPanel({
  challenge,
  code,
  resendSeconds,
  onCodeChange,
  onConfirm,
  onResend,
  onBack,
}: DeviceVerificationPanelProps) {
  return (
    <section aria-labelledby="device-verification-heading" className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h2 id="device-verification-heading" className="text-lg font-semibold text-foreground">
        Confirme esta instalação
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Como você está entrando por uma instalação ainda não reconhecida, enviamos um código para{" "}
        <strong className="font-medium text-foreground">{challenge.emailMasked}</strong>.
        Digite o código para concluir o acesso.
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        O código vence em 10 minutos. Há 3 tentativas; depois da primeira e da segunda resposta incorreta, o reenvio aguarda 30 e 90 segundos. No terceiro erro, a conta fica bloqueada e será necessário falar com o suporte.
      </p>
      <form onSubmit={onConfirm} className="mt-4 space-y-4">
        <label htmlFor="device-verification-code" className="block text-sm font-medium text-foreground">
          Código de confirmação
        </label>
        <Input
          id="device-verification-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-describedby="device-verification-expiry"
          className="h-12 rounded-xl border-border bg-card tracking-[0.35em] text-foreground"
          required
        />
        <p id="device-verification-expiry" className="text-xs text-muted-foreground">
          O código expira em 10 minutos. Três códigos incorretos bloqueiam a conta e exigem contato com o suporte.
        </p>
        <Button type="submit" className="min-h-11 w-full rounded-xl" disabled={code.length !== 6}>
          Confirmar código
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-xl"
          disabled={resendSeconds > 0}
          onClick={onResend}
        >
          {resendSeconds > 0 ? `Reenviar código em ${resendSeconds}s` : "Enviar outro código"}
        </Button>
        <button
          type="button"
          className="w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onBack}
        >
          Voltar ao login
        </button>
      </form>
    </section>
  );
}
