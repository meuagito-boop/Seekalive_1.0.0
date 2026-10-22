import { BrandMark } from "@/components/brand/BrandMark";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Circle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

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
      toast({ title: "Verificação não configurada", description: "Nenhum código foi enviado. A verificação será conectada junto com o serviço de autenticação." });
    }
  }

  function handleResend() {
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    toast({ title: "Reenvio indisponível", description: "O envio de e-mails ainda não está conectado." });
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
              A confirmação por e-mail será ativada quando o serviço de contas for conectado. Nenhum código foi enviado.
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
              <button className="text-primary hover:underline" onClick={handleResend} data-testid="button-resend">
                Tentar enviar novamente
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
