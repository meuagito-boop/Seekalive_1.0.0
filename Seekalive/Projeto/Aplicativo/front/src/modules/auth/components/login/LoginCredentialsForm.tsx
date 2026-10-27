import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { UseFormReturn } from "react-hook-form";
import type { LoginFormValues } from "@/modules/auth/application/loginFormSchema";

type Props = {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: (values: LoginFormValues) => void;
  showPassword: boolean;
  savePassword: boolean;
  onShowPasswordChange: (show: boolean) => void;
  onSavePasswordChange: (save: boolean) => void;
};

export function LoginCredentialsForm({
  form,
  onSubmit,
  showPassword,
  savePassword,
  onShowPasswordChange,
  onSavePasswordChange,
}: Props) {
  return (
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
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    aria-pressed={showPassword}
                    onClick={() => onShowPasswordChange(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
            data-testid="link-forgot-password"
          >
            Esqueci minha senha
          </Link>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={savePassword}
            onChange={(event) => onSavePasswordChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
            data-testid="checkbox-save-password"
          />
          <span>
            Salvar senha no gerenciador do navegador
            <span className="mt-0.5 block text-xs">
              O Seekalive não armazena sua senha neste dispositivo.
            </span>
          </span>
        </label>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl font-semibold text-base"
          disabled={form.formState.isSubmitting}
          data-testid="button-login"
        >
          {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Form>
  );
}
