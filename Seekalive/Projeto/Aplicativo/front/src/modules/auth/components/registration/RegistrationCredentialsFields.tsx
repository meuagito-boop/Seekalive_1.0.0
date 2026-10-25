import { Check, Eye, EyeOff } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RegistrationFormValues } from "@/modules/auth/types/registrationSchema";

interface RegistrationCredentialsFieldsProps {
  showPassword: boolean;
  isUsernameValidFormat: boolean;
  onTogglePassword: () => void;
}

export function RegistrationCredentialsFields({
  showPassword,
  isUsernameValidFormat,
  onTogglePassword,
}: RegistrationCredentialsFieldsProps) {
  const { control } = useFormContext<RegistrationFormValues>();

  return (
    <>
      <FormField
        control={control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input {...field} aria-label="Nome de usuário" placeholder="nome de usuário" data-testid="input-username" className="h-12 bg-card border-border rounded-xl pl-8 pr-10" />
                {isUsernameValidFormat && (
                  <span aria-label="Formato válido" className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} type="email" aria-label="E-mail" autoComplete="email" placeholder="E-mail" data-testid="input-email" className="h-12 bg-card border-border rounded-xl" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Input {...field} type={showPassword ? "text" : "password"} minLength={8} maxLength={128} aria-label="Senha" autoComplete="new-password" placeholder="Senha" data-testid="input-password" className="h-12 bg-card border-border rounded-xl pr-12" />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={onTogglePassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormControl>
            <FormDescription>De 8 a 128 caracteres, com maiúscula, minúscula, número e caractere especial.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} type="password" minLength={8} maxLength={128} aria-label="Confirmar senha" autoComplete="new-password" placeholder="Confirmar senha" data-testid="input-confirm-password" className="h-12 bg-card border-border rounded-xl" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="terms"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <label className="flex items-center gap-3 cursor-pointer" data-testid="checkbox-terms">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={field.value}
                  aria-label="Aceito os Termos de Serviço e a Política de Privacidade"
                  className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${field.value ? "bg-primary border-primary" : "border-border"}`}
                  onClick={() => field.onChange(!field.value)}
                >
                  {field.value && <Check className="w-3 h-3 text-primary-foreground" />}
                </button>
                <span className="text-sm text-muted-foreground">
                  Aceito os <span className="text-primary hover:underline cursor-pointer">Termos de Serviço</span>
                  {" "}e <span className="text-primary hover:underline cursor-pointer">Política de Privacidade</span>
                </span>
              </label>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
