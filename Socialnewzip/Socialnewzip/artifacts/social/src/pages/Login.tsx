import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useAppContext } from "@/context/AppContext";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAppContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(_values: FormValues) {
    login();
    setLocation("/feed");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight text-foreground">Seekalive</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Entrar</h1>
        <p className="text-muted-foreground mb-8 text-sm">Bem-vindo de volta ao universo.</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Email"
                      data-testid="input-email"
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
                        placeholder="Senha"
                        data-testid="input-password"
                        className="h-12 bg-card border-border text-foreground rounded-xl pr-12"
                      />
                      <button
                        type="button"
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

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-base"
              data-testid="button-login"
            >
              Entrar
            </Button>
          </form>
        </Form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-background px-3">ou continue com</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border font-medium"
            data-testid="button-google-login"
            onClick={() => { login(); setLocation("/feed"); }}
          >
            <span className="mr-2 font-bold text-blue-400">G</span>
            Continuar com Google
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border font-medium"
            data-testid="button-apple-login"
            onClick={() => { login(); setLocation("/feed"); }}
          >
            <span className="mr-2">&#63743;</span>
            Continuar com Apple
          </Button>
        </div>

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
