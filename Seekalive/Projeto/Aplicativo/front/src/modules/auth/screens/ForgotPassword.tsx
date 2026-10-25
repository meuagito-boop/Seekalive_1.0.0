import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetConfirmSchema, passwordResetRequestSchema } from "@workspace/api-zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { confirmPasswordReset, requestPasswordReset } from "@/modules/auth/services/passwordApi";

export default function ForgotPassword() {
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const requestForm = useForm({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const confirmForm = useForm({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: { email: "", code: "", newPassword: "", passwordConfirmation: "" },
  });

  async function submitRequest(values: { email: string }) {
    setIsSubmitting(true);
    setApiError(null);
    const normalizedEmail = values.email.trim().toLowerCase();
    try {
      await requestPasswordReset({ email: normalizedEmail });
      setEmail(normalizedEmail);
      confirmForm.setValue("email", normalizedEmail);
      setStep("confirm");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível processar a solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitConfirmation(values: {
    email: string;
    code: string;
    newPassword: string;
    passwordConfirmation: string;
  }) {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await confirmPasswordReset(values);
      confirmForm.reset({ email, code: "", newPassword: "", passwordConfirmation: "" });
      setStep("done");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeEmail() {
    setApiError(null);
    setStep("request");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight">Seekalive</span>
        </div>

        <AnimatePresence mode="wait">
          {step === "request" ? (
            <motion.div key="request" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Esqueceu a senha?</h1>
              <p className="text-muted-foreground mb-8 text-sm">
                Informe o e-mail da sua conta. A resposta não confirma se esse endereço está cadastrado.
              </p>

              <Form {...requestForm}>
                <form onSubmit={requestForm.handleSubmit(submitRequest)} className="space-y-4">
                  <FormField
                    control={requestForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Seu e-mail"
                              aria-label="E-mail da conta"
                              autoComplete="email"
                              autoCapitalize="none"
                              data-testid="input-email"
                              className="h-12 bg-card border-border rounded-xl pl-11"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {apiError && <p role="alert" className="text-sm text-destructive">{apiError}</p>}
                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl font-semibold" data-testid="button-send-reset">
                    {isSubmitting ? "Enviando..." : "Enviar instruções"}
                  </Button>
                </form>
              </Form>
            </motion.div>
          ) : step === "confirm" ? (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex justify-center mb-6">
                <Mail className="w-14 h-14 text-primary" aria-hidden="true" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Redefina sua senha</h1>
              <p className="text-muted-foreground mb-6 text-sm" aria-live="polite">
                Se houver uma conta ativa e verificada para <span className="font-medium text-foreground">{email}</span>,
                enviaremos um código de seis dígitos. Ele expira em 10 minutos.
              </p>
              <p className="text-xs text-muted-foreground mb-5">
                Confira também a pasta de spam. Por segurança, há um intervalo de 60 segundos entre solicitações.
              </p>

              <Form {...confirmForm}>
                <form onSubmit={confirmForm.handleSubmit(submitConfirmation)} className="space-y-4">
                  <FormField
                    control={confirmForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="Código de seis dígitos"
                            aria-label="Código de redefinição"
                            data-testid="input-reset-code"
                            className="h-12 bg-card border-border rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={confirmForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            placeholder="Nova senha"
                            aria-label="Nova senha"
                            aria-describedby="reset-password-requirements"
                            data-testid="input-reset-password"
                            className="h-12 bg-card border-border rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p id="reset-password-requirements" className="text-xs text-muted-foreground">
                    8–128 caracteres, com maiúscula, minúscula, número e caractere especial.
                  </p>
                  <FormField
                    control={confirmForm.control}
                    name="passwordConfirmation"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            placeholder="Confirmar nova senha"
                            aria-label="Confirmar nova senha"
                            data-testid="input-reset-password-confirmation"
                            className="h-12 bg-card border-border rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {apiError && <p role="alert" className="text-sm text-destructive">{apiError}</p>}
                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl font-semibold" data-testid="button-confirm-reset">
                    {isSubmitting ? "Atualizando..." : "Redefinir senha"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={changeEmail} disabled={isSubmitting}>
                    Corrigir e-mail
                  </Button>
                </form>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-primary" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Senha atualizada</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Entre com sua nova senha. Por segurança, as sessões anteriores foram encerradas.
              </p>
              <Button asChild className="w-full h-12 rounded-xl font-semibold" data-testid="button-reset-login">
                <Link href="/login">Ir para o login</Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <Link href="/login" className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-login">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>
      </motion.div>
    </div>
  );
}
