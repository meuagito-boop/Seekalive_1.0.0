import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RegistrationFormValues } from "@/modules/auth/types/registrationSchema";

export function PersonalRegistrationFields() {
  const { control } = useFormContext<RegistrationFormValues>();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} aria-label="Nome" autoComplete="given-name" placeholder="Nome" data-testid="input-first-name" className="h-12 bg-card border-border rounded-xl" />
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
                <Input {...field} aria-label="Sobrenome" autoComplete="family-name" placeholder="Sobrenome" data-testid="input-last-name" className="h-12 bg-card border-border rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="age"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} type="number" min={18} max={120} inputMode="numeric" aria-label="Idade" placeholder="Idade" data-testid="input-age" className="h-12 bg-card border-border rounded-xl" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
