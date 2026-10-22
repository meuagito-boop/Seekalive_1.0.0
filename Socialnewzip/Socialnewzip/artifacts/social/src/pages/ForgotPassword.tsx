import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  function onSubmit(_values: FormValues) {
    setSent(true);
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
          {!sent ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-3xl font-bold mb-2">Esqueceu a senha?</h1>
              <p className="text-muted-foreground mb-8 text-sm">
                Insira seu email e enviaremos um link para redefinir sua senha.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Seu email"
                              data-testid="input-email"
                              className="h-12 bg-card border-border rounded-xl pl-11"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12 rounded-xl font-semibold" data-testid="button-send-reset">
                    Enviar link de redefinição
                  </Button>
                </form>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Email enviado!</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <Button
                className="w-full h-12 rounded-xl font-semibold"
                onClick={() => setSent(false)}
                data-testid="button-resend"
              >
                Reenviar email
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
