import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().trim().min(3, "Informe seu nome de usuário ou e-mail"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  function onSubmit(_values: FormValues) {
    toast({
      title: "Login ainda não conectado",
      description: "A autenticação será ligada ao serviço de contas quando o backend for iniciado. A senha não foi enviada nem salva pelo Seekalive.",
    });
  }

  return (
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-[1.75rem] border border-border bg-card/85 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-9"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight text-foreground">Seekalive</span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Que bom ter você de volta</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Entrar</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">Acesse sua conta Seekalive e continue de onde parou.</p>
        <p role="note" className="mb-5 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
          O login real será conectado ao serviço de contas. Por enquanto, o formulário não envia nem armazena sua senha.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      aria-label="Nome de usuário ou e-mail"
                      autoCapitalize="none"
                      autoComplete="username"
                      placeholder="Nome de usuário ou e-mail"
                      data-testid="input-identifier"
                      className="h-12 bg-card border-border text-foreground rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        aria-label="Senha"
                        autoComplete={savePassword ? "current-password" : "off"}
                        placeholder="Senha"
                        data-testid="input-password"
                        className="h-12 bg-card border-border text-foreground rounded-xl pr-12"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                Esqueci minha senha
              </Link>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={savePassword}
                onChange={event => setSavePassword(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
                data-testid="checkbox-save-password"
              />
              <span>
                Salvar senha no gerenciador do navegador
                <span className="mt-0.5 block text-xs">O Seekalive não armazena sua senha neste dispositivo.</span>
              </span>
            </label>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-base"
              data-testid="button-login"
            >
              Entrar
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Ainda não tem conta?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
