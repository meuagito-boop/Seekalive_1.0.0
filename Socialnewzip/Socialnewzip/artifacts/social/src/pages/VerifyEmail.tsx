import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Circle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";

export default function VerifyEmail() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [, setLocation] = useLocation();
  const { login } = useAppContext();

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [resendTimer]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleVerify() {
    if (code.every(c => c !== "")) {
      setVerified(true);
      setTimeout(() => {
        login();
        setLocation("/onboarding/interests");
      }, 1200);
    }
  }

  function handleResend() {
    setResendTimer(60);
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
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
          <Circle className="w-8 h-8 fill-primary text-primary" />
          <span className="text-2xl font-bold tracking-tight">Orbit</span>
        </div>

        {verified ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Email verificado!</h2>
            <p className="text-muted-foreground mt-2 text-sm">Redirecionando...</p>
          </motion.div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Circle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Verificar email</h1>
            <p className="text-muted-foreground mb-8 text-sm">
              Enviamos um código de 6 dígitos para o seu email.
            </p>

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
              disabled={!isFull}
              data-testid="button-verify"
            >
              Verificar
            </Button>

            <div className="mt-6 text-sm text-muted-foreground">
              {resendTimer > 0 ? (
                <span>Reenviar em {resendTimer}s</span>
              ) : (
                <button
                  className="text-primary hover:underline"
                  onClick={handleResend}
                  data-testid="button-resend"
                >
                  Reenviar código
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
