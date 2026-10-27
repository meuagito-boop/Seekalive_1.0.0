import type { Control } from "react-hook-form";
import { Check } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RegistrationFormValues } from "@/modules/auth/application/registrationFormSchema";

type Props = {
  control: Control<RegistrationFormValues>;
  usernameIsValid: boolean;
};

export function RegistrationIdentityFields({
  control,
  usernameIsValid,
}: Props) {
  return (
    <>
      <FormField
        control={control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  {...field}
                  aria-label="Nome de usuário"
                  placeholder="nome de usuário"
                  data-testid="input-username"
                  className="h-12 bg-card border-border rounded-xl pl-8 pr-10"
                />
                {usernameIsValid && (
                  <span
                    aria-label="Formato válido"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500"
                  >
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
              <Input
                {...field}
                type="email"
                aria-label="E-mail"
                autoComplete="email"
                placeholder="E-mail"
                data-testid="input-email"
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
