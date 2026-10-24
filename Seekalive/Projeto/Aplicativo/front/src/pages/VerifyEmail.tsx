import { BrandMark } from "@/components/brand/BrandMark";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { AuthApiError, confirmEmail, resendVerification } from "@/services/authApi";

export default function VerifyEmail() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState(() => sessionStorage.getItem("seekalive:pending-email") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setAuthenticatedAccount } = useAppContext();

  function handleChange(index: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      const next = [...code];
      next[index] = "";
      setCode(next);
      return;
    }
    const newCode = [...code];
    if (digits.length > 1) {
      digits.slice(0, 6 - index).split("").forEach((digit, offset) => {
        newCode[index + offset] = digit;
      });
      setCode(newCode);
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }
    newCode[index] = digits;
    setCode(newCode);
    if (index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!email.trim()) {
      toast({ title: "Informe seu e-mail", description: "Use o mesmo e-mail informado no cadastro.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await confirmEmail({ email: email.trim().toLowerCase(), code: code.join("") });
      sessionStorage.removeItem("seekalive:pending-email");
      if ("passwordUpdateRequired" in result) {
        toast({ title: "E-mail confirmado", description: result.message });
        setLocation("/login");
        return;
      }
      setAuthenticatedAccount(result.account);
      toast({ title: "E-mail confirmado", description: "Sua conta está ativa." });
      setLocation(result.account.onboardingCompleted ? "/feed" : "/onboarding/interests");
    } catch (error) {
      toast({
        title: "Não foi possível confirmar",
        description: error instanceof Error ? error.message : "Confira o código e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      toast({ title: "Informe seu e-mail", description: "Use o mesmo e-mail informado no cadastro.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await resendVerification({ email: email.trim().toLowerCase() });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      toast({ title: "Solicitação recebida", description: result.message });
    } catch (error) {
      const description = error instanceof AuthApiError
        ? error.message
        : "Não foi possível enviar um novo código. Tente novamente mais tarde.";
      toast({ title: "Reenvio indisponível", description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFull = code.every(c => c !== "");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-10">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">Seekalive</span>
        </div>

        <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Circle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Verificar email</h1>
            <p className="text-muted-foreground mb-8 text-sm">
              Confirme o e-mail da sua conta para liberar o acesso ao Seekalive.
            </p>

            <label className="mb-5 block text-left text-sm font-medium">
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-foreground outline-none focus:border-primary"
                data-testid="input-verification-email"
              />
            </label>

            <div className="flex gap-2 justify-center mb-8">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  maxLength={1}
                  data-testid={`input-otp-${i}`}
                  className="w-11 h-14 text-center text-xl font-bold bg-card border-2 border-border rounded-xl text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              ))}
            </div>

            <Button
              className="w-full h-12 rounded-xl font-semibold"
              onClick={handleVerify}
              disabled={!isFull || isSubmitting || !email.trim()}
              data-testid="button-verify"
            >
              {isSubmitting ? "Verificando..." : "Verificar"}
            </Button>

            <div className="mt-6 text-sm text-muted-foreground">
              <button className="text-primary hover:underline disabled:opacity-50" onClick={handleResend} disabled={isSubmitting || !email.trim()} data-testid="button-resend">
                Tentar enviar novamente
              </button>
            </div>
          </>
      </motion.div>
    </div>
  );
}
