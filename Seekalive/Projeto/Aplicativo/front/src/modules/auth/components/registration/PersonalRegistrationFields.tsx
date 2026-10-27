import type { Control } from "react-hook-form";
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
};

export function PersonalRegistrationFields({ control }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                aria-label="Nome"
                autoComplete="given-name"
                placeholder="Nome"
                data-testid="input-first-name"
                className="h-12 bg-card border-border rounded-xl"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                aria-label="Sobrenome"
                autoComplete="family-name"
                placeholder="Sobrenome"
                data-testid="input-last-name"
                className="h-12 bg-card border-border rounded-xl"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
