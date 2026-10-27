import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Control } from "react-hook-form";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
};

export function RegistrationCredentialsFields({ control }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <FormField
        control={control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  aria-label="Senha"
                  autoComplete="new-password"
                  placeholder="Senha"
                  data-testid="input-password"
                  className="h-12 bg-card border-border rounded-xl pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
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
            <FormDescription>
              De 8 a 128 caracteres, com maiúscula, minúscula, número e
              caractere especial.
            </FormDescription>
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
              <Input
                {...field}
                type="password"
                minLength={8}
                maxLength={128}
                aria-label="Confirmar senha"
                autoComplete="new-password"
                placeholder="Confirmar senha"
                data-testid="input-confirm-password"
                className="h-12 bg-card border-border rounded-xl"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
